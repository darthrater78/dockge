import { log } from "./log";
import childProcessAsync from "promisify-child-process";
import yaml from "yaml";
import fs from "fs";
import path from "path";
import { acceptedComposeFileNames } from "../common/util-common";

export interface ImageRef {
    repository: string;
    tag: string;
}

export interface VersionMismatch {
    stackName: string;
    service: string;
    composeImage: string;
    runningImage: string;
    composePath: string;
    isSelf?: boolean;
}

export interface VersionScanResult {
    mismatches: VersionMismatch[];
    matched: { stackName: string; service: string; image: string }[];
    unmatchedServices: { stackName: string; service: string; composeImage: string }[];
}

interface RunningContainerInfo {
    project: string;
    service: string;
    imageTags: string[];
    configImage: string;
}

export function parseImageRef(image: string): ImageRef {
    if (!image) {
        return { repository: "", tag: "" };
    }

    const atIndex = image.indexOf("@");
    if (atIndex > 0) {
        return { repository: image.substring(0, atIndex), tag: image.substring(atIndex) };
    }

    const lastColon = image.lastIndexOf(":");
    if (lastColon > 0 && !image.substring(lastColon).includes("/")) {
        return { repository: image.substring(0, lastColon), tag: image.substring(lastColon + 1) };
    }

    return { repository: image, tag: "latest" };
}

export function normalizeImageName(name: string): string {
    let normalized = name;
    if (normalized.startsWith("docker.io/")) {
        normalized = normalized.substring("docker.io/".length);
    }
    if (normalized.startsWith("library/")) {
        normalized = normalized.substring("library/".length);
    }
    return normalized;
}

function imageRefsMatch(composeImage: string, runningImage: string): boolean {
    const composeRef = parseImageRef(composeImage);
    const runningRef = parseImageRef(runningImage);

    const composeRepo = normalizeImageName(composeRef.repository);
    const runningRepo = normalizeImageName(runningRef.repository);

    return composeRepo === runningRepo && composeRef.tag === runningRef.tag;
}

async function getRunningContainers(): Promise<Map<string, RunningContainerInfo>> {
    const containers = new Map<string, RunningContainerInfo>();

    const res = await childProcessAsync.spawn("docker", [
        "ps", "--format", "{{json .}}", "--no-trunc"
    ], { encoding: "utf-8" });

    if (!res.stdout) {
        return containers;
    }

    const lines = res.stdout.toString().trim().split("\n").filter(Boolean);

    for (const line of lines) {
        const info = JSON.parse(line);
        const labels = info.Labels || "";

        const labelMap = new Map<string, string>();
        for (const part of labels.split(",")) {
            const eqIdx = part.indexOf("=");
            if (eqIdx > 0) {
                labelMap.set(part.substring(0, eqIdx), part.substring(eqIdx + 1));
            }
        }

        const project = labelMap.get("com.docker.compose.project");
        const service = labelMap.get("com.docker.compose.service");

        if (!project || !service) {
            continue;
        }

        const containerId = info.ID;
        let imageTags: string[] = [];
        let configImage = info.Image || "";

        try {
            const inspectRes = await childProcessAsync.spawn("docker", [
                "inspect", "--format", "json", containerId
            ], { encoding: "utf-8" });

            if (inspectRes.stdout) {
                const inspectData = JSON.parse(inspectRes.stdout.toString());
                if (Array.isArray(inspectData) && inspectData[0]) {
                    configImage = inspectData[0].Config?.Image || configImage;
                    const imageId = inspectData[0].Image;
                    if (imageId) {
                        const imgInspect = await childProcessAsync.spawn("docker", [
                            "image", "inspect", "--format", "json", imageId
                        ], { encoding: "utf-8" });
                        if (imgInspect.stdout) {
                            const imgData = JSON.parse(imgInspect.stdout.toString());
                            if (Array.isArray(imgData) && imgData[0]) {
                                imageTags = imgData[0].RepoTags || [];
                            }
                        }
                    }
                }
            }
        } catch (e) {
            log.debug("compose-version-sync", `Failed to inspect container ${containerId}: ${e}`);
        }

        const key = `${project}::${service}`;
        containers.set(key, { project, service, imageTags, configImage });
    }

    return containers;
}

function getComposeServices(composePath: string): Map<string, string> {
    const services = new Map<string, string>();
    try {
        const content = fs.readFileSync(composePath, "utf-8");
        const doc = yaml.parse(content);
        if (doc?.services) {
            for (const [name, svc] of Object.entries(doc.services)) {
                const service = svc as Record<string, unknown>;
                if (service.image && typeof service.image === "string") {
                    services.set(name, service.image);
                }
            }
        }
    } catch (e) {
        log.warn("compose-version-sync", `Failed to parse compose file ${composePath}: ${e}`);
    }
    return services;
}

function findComposeFile(stackDir: string): string | null {
    for (const filename of acceptedComposeFileNames) {
        const filePath = path.join(stackDir, filename);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
}

function findBestRunningTag(imageTags: string[], composeImage: string): string {
    if (imageTags.length === 0) {
        return "";
    }

    const composeRef = parseImageRef(composeImage);
    const composeRepo = normalizeImageName(composeRef.repository);

    for (const tag of imageTags) {
        const tagRef = parseImageRef(tag);
        if (normalizeImageName(tagRef.repository) === composeRepo) {
            return tag;
        }
    }

    return imageTags[0];
}

export async function scanStack(stacksDir: string, stackName: string): Promise<VersionScanResult> {
    const result: VersionScanResult = {
        mismatches: [],
        matched: [],
        unmatchedServices: [],
    };

    const stackDir = path.join(stacksDir, stackName);
    const resolvedStackDir = path.resolve(stackDir);
    const resolvedStacksDir = path.resolve(stacksDir);
    if (!resolvedStackDir.startsWith(resolvedStacksDir + path.sep) && resolvedStackDir !== resolvedStacksDir) {
        log.warn("compose-version-sync", `Stack directory ${stackDir} is outside stacks directory`);
        return result;
    }

    const composePath = findComposeFile(stackDir);
    if (!composePath) {
        return result;
    }

    const composeServices = getComposeServices(composePath);
    const runningContainers = await getRunningContainers();

    for (const [serviceName, composeImage] of composeServices) {
        const key = `${stackName}::${serviceName}`;
        const container = runningContainers.get(key);

        if (!container) {
            result.unmatchedServices.push({ stackName, service: serviceName, composeImage });
            continue;
        }

        const bestTag = findBestRunningTag(container.imageTags, composeImage);
        const runningImage = bestTag || container.configImage;

        if (imageRefsMatch(composeImage, runningImage)) {
            result.matched.push({ stackName, service: serviceName, image: composeImage });
        } else {
            result.mismatches.push({
                stackName,
                service: serviceName,
                composeImage,
                runningImage,
                composePath,
            });
        }
    }

    return result;
}

export async function scanAllStacks(stacksDir: string): Promise<VersionScanResult> {
    const combined: VersionScanResult = {
        mismatches: [],
        matched: [],
        unmatchedServices: [],
    };

    if (!fs.existsSync(stacksDir)) {
        return combined;
    }

    const entries = fs.readdirSync(stacksDir);
    for (const entry of entries) {
        const entryPath = path.join(stacksDir, entry);
        try {
            const stat = fs.statSync(entryPath);
            if (!stat.isDirectory()) {
                continue;
            }
        } catch {
            continue;
        }

        const result = await scanStack(stacksDir, entry);
        combined.mismatches.push(...result.mismatches);
        combined.matched.push(...result.matched);
        combined.unmatchedServices.push(...result.unmatchedServices);
    }

    const selfResult = await scanSelfStack();
    combined.mismatches.push(...selfResult.mismatches);
    combined.matched.push(...selfResult.matched);
    combined.unmatchedServices.push(...selfResult.unmatchedServices);

    return combined;
}

interface SelfComposeInfo {
    projectName: string;
    composeDir: string;
}

let cachedSelfCompose: SelfComposeInfo | null | undefined = undefined;

async function detectSelfCompose(): Promise<SelfComposeInfo | null> {
    if (cachedSelfCompose !== undefined) {
        return cachedSelfCompose;
    }

    let containerId = "";

    try {
        const content = fs.readFileSync("/proc/self/cgroup", "utf-8");
        const match = content.match(/[0-9a-f]{64}/);
        if (match) {
            containerId = match[0];
        }
    } catch {
        // Not in a container or can't read cgroup
    }

    if (!containerId) {
        const hostname = process.env.HOSTNAME || "";
        if (/^[0-9a-f]{12,64}$/.test(hostname)) {
            containerId = hostname;
        }
    }

    if (!containerId) {
        cachedSelfCompose = null;
        return null;
    }

    try {
        const res = await childProcessAsync.spawn("docker", [
            "inspect", "--format", "json", containerId
        ], { encoding: "utf-8" });

        if (!res.stdout) {
            cachedSelfCompose = null;
            return null;
        }

        const data = JSON.parse(res.stdout.toString());
        if (!Array.isArray(data) || !data[0]) {
            cachedSelfCompose = null;
            return null;
        }

        const labels = data[0].Config?.Labels || {};
        const projectName = labels["com.docker.compose.project"];
        const workingDir = labels["com.docker.compose.project.working_dir"];

        if (!projectName || !workingDir) {
            cachedSelfCompose = null;
            return null;
        }

        const composeDir = process.env.DOCKGE_SELF_DIR || workingDir;

        if (!fs.existsSync(composeDir)) {
            log.debug("compose-version-sync", `Self compose dir ${composeDir} not accessible — mount it to enable self-drift-check`);
            cachedSelfCompose = null;
            return null;
        }

        const composePath = findComposeFile(composeDir);
        if (!composePath) {
            cachedSelfCompose = null;
            return null;
        }

        cachedSelfCompose = { projectName, composeDir };
        log.info("compose-version-sync", `Detected self compose: project=${projectName} dir=${composeDir}`);
        return cachedSelfCompose;
    } catch (e) {
        log.debug("compose-version-sync", `Failed to detect self compose: ${e}`);
        cachedSelfCompose = null;
        return null;
    }
}

export async function getSelfComposeDir(): Promise<string | null> {
    const info = await detectSelfCompose();
    return info ? info.composeDir : null;
}

export async function scanSelfStack(): Promise<VersionScanResult> {
    const result: VersionScanResult = {
        mismatches: [],
        matched: [],
        unmatchedServices: [],
    };

    const selfCompose = await detectSelfCompose();
    if (!selfCompose) {
        return result;
    }

    const composePath = findComposeFile(selfCompose.composeDir);
    if (!composePath) {
        return result;
    }

    const composeServices = getComposeServices(composePath);
    const runningContainers = await getRunningContainers();

    for (const [serviceName, composeImage] of composeServices) {
        const key = `${selfCompose.projectName}::${serviceName}`;
        const container = runningContainers.get(key);

        if (!container) {
            result.unmatchedServices.push({ stackName: selfCompose.projectName, service: serviceName, composeImage });
            continue;
        }

        const bestTag = findBestRunningTag(container.imageTags, composeImage);
        const runningImage = bestTag || container.configImage;

        if (imageRefsMatch(composeImage, runningImage)) {
            result.matched.push({ stackName: selfCompose.projectName, service: serviceName, image: composeImage });
        } else {
            result.mismatches.push({
                stackName: selfCompose.projectName,
                service: serviceName,
                composeImage,
                runningImage,
                composePath,
                isSelf: true,
            });
        }
    }

    return result;
}

export function syncComposeFile(composePath: string, serviceName: string, newImage: string, stacksDir: string, additionalAllowedDirs?: string[]): { oldImage: string; success: boolean } {
    const resolvedPath = path.resolve(composePath);
    const resolvedStacksDir = path.resolve(stacksDir);

    let allowed = resolvedPath.startsWith(resolvedStacksDir + path.sep);

    if (!allowed && additionalAllowedDirs) {
        for (const dir of additionalAllowedDirs) {
            const resolvedDir = path.resolve(dir);
            if (resolvedPath.startsWith(resolvedDir + path.sep)) {
                allowed = true;
                break;
            }
        }
    }

    if (!allowed) {
        throw new Error("Compose file path is outside allowed directories");
    }

    const content = fs.readFileSync(composePath, "utf-8");
    const doc = yaml.parseDocument(content);

    const servicesNode = doc.get("services");
    if (!servicesNode || typeof servicesNode !== "object") {
        throw new Error("No services found in compose file");
    }

    const serviceNode = (servicesNode as yaml.YAMLMap).get(serviceName);
    if (!serviceNode || typeof serviceNode !== "object") {
        throw new Error(`Service '${serviceName}' not found in compose file`);
    }

    const oldImage = (serviceNode as yaml.YAMLMap).get("image") as string;
    if (!oldImage) {
        throw new Error(`Service '${serviceName}' has no image field`);
    }

    (serviceNode as yaml.YAMLMap).set("image", newImage);

    fs.writeFileSync(composePath, doc.toString(), "utf-8");

    return { oldImage, success: true };
}

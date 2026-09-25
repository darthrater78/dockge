import { CREATED_FILE, CREATED_STACK, EXITED, RUNNING, UNKNOWN } from "../../common/util-common";

/**
 * Shared stack-list helpers for the desktop sidebar (StackList) and the mobile list (MobileStackList).
 */

// Stacks sort by status in this order, then by name
const STATUS_ORDER = [ RUNNING, EXITED, CREATED_STACK, CREATED_FILE, UNKNOWN ];

/**
 * Reduce a compose port mapping ("8080:80", "127.0.0.1:8443:443/udp", "53") to its host port.
 * @param {string} raw Port entry from compose.yaml
 * @returns {string} The host port
 */
export function hostPort(raw : string) : string {
    const stripped = raw.split("/")[0];
    const lastColon = stripped.lastIndexOf(":");
    if (lastColon === -1) {
        return stripped;
    }
    const hostPart = stripped.substring(0, lastColon);
    const ipColon = hostPart.indexOf(":");
    if (ipColon !== -1) {
        return hostPart.substring(ipColon + 1);
    }
    return hostPart;
}

/**
 * @param {object} stack A stack from $root.completeStackList
 * @returns {string[]} Its host ports, in compose order
 */
export function stackPorts(stack) : string[] {
    if (!stack?.ports || stack.ports.length === 0) {
        return [];
    }
    return stack.ports.map(hostPort);
}

/**
 * Sort order: managed by Dockge first, then by status, then by name.
 * @param {object} a Stack
 * @param {object} b Stack
 * @returns {number} Comparator result
 */
export function compareStacks(a, b) : number {
    if (a.isManagedByDockge !== b.isManagedByDockge) {
        return a.isManagedByDockge ? -1 : 1;
    }
    if (a.status !== b.status) {
        const rank = (s) => {
            const i = STATUS_ORDER.indexOf(s);
            return i === -1 ? STATUS_ORDER.length : i;
        };
        const diff = rank(a.status) - rank(b.status);
        if (diff !== 0) {
            return diff;
        }
    }
    return a.name.localeCompare(b.name);
}

/**
 * Host ports published by more than one running stack, per endpoint ("current" for the local one).
 * @param {object[]} stacks All stacks
 * @returns {Record<string, Set<string>>} Conflicting host ports by endpoint
 */
export function conflictingPortsByEndpoint(stacks) : Record<string, Set<string>> {
    const result : Record<string, Set<string>> = {};
    for (const { endpoint, port } of portConflicts(stacks)) {
        (result[endpoint] ??= new Set()).add(port);
    }
    return result;
}

/**
 * Split a stack's ports into the ones to show and a hidden overflow. Conflicting ports always come
 * first, so a conflict is never hidden behind the "+N" badge.
 * @param {string[]} ports Host ports
 * @param {Set<string>} conflicts Conflicting host ports
 * @param {number} max How many to show
 * @returns {{ visible: string[], hidden: string[] }} Ports to show, and the rest
 */
export function splitPorts(ports : string[], conflicts : Set<string>, max : number) {
    const unique = [ ...new Set(ports) ];
    const ordered = [
        ...unique.filter(p => conflicts.has(p)),
        ...unique.filter(p => !conflicts.has(p)),
    ];
    return {
        visible: ordered.slice(0, max),
        hidden: ordered.slice(max),
    };
}

/**
 * @param {object} stack Stack
 * @returns {string} Its route
 */
export function stackUrl(stack) : string {
    return stack.endpoint ? `/compose/${stack.name}/${stack.endpoint}` : `/compose/${stack.name}`;
}

/**
 * Every host port published by more than one running stack, with the stacks that publish it.
 * @param {object[]} stacks All stacks
 * @returns {{ endpoint: string, port: string, stacks: string[] }[]} Conflicts, sorted by endpoint then port
 */
export function portConflicts(stacks) {
    const users : Record<string, Record<string, string[]>> = {};
    for (const stack of stacks) {
        if (stack.status !== RUNNING) {
            continue;
        }
        const endpoint = stack.endpoint || "current";
        users[endpoint] ??= {};
        for (const port of new Set(stackPorts(stack))) {
            (users[endpoint][port] ??= []).push(stack.name);
        }
    }
    const result : { endpoint: string, port: string, stacks: string[] }[] = [];
    for (const [ endpoint, ports ] of Object.entries(users)) {
        for (const [ port, names ] of Object.entries(ports)) {
            if (names.length > 1) {
                result.push({ endpoint, port, stacks: names.sort() });
            }
        }
    }
    return result.sort((a, b) => a.endpoint.localeCompare(b.endpoint) || Number(a.port) - Number(b.port) || a.port.localeCompare(b.port));
}

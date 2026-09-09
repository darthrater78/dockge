<template>
    <router-link :to="url" :class="{ 'dim' : !stack.isManagedByDockge }" class="item">
        <Uptime :stack="stack" :fixed-width="true" class="me-2" />
        <div class="title-and-ports">
            <span class="title">{{ stackName }}</span>
            <span v-if="displayPorts.length > 0" class="ports">
                <span class="port-label">Active Ports:</span>
                <span v-for="port in displayPorts" :key="port" class="badge port-badge">{{ port }}</span>
                <span v-if="overflowCount > 0" class="badge port-badge port-overflow">+{{ overflowCount }}</span>
            </span>
            <span v-else class="ports">
                <span class="badge host-badge">HOST</span>
            </span>
        </div>
    </router-link>
</template>

<script>
import Uptime from "./Uptime.vue";

const MAX_VISIBLE_PORTS = 3;

export default {
    components: {
        Uptime
    },
    props: {
        /** Stack this represents */
        stack: {
            type: Object,
            default: null,
        },
        /** If the user is in select mode */
        isSelectMode: {
            type: Boolean,
            default: false,
        },
        /** How many ancestors are above this stack */
        depth: {
            type: Number,
            default: 0,
        },
        /** Callback to determine if stack is selected */
        isSelected: {
            type: Function,
            default: () => {}
        },
        /** Callback fired when stack is selected */
        select: {
            type: Function,
            default: () => {}
        },
        /** Callback fired when stack is deselected */
        deselect: {
            type: Function,
            default: () => {}
        },
    },
    data() {
        return {
            isCollapsed: true,
        };
    },
    computed: {
        endpointDisplay() {
            return this.$root.endpointDisplayFunction(this.stack.endpoint);
        },
        url() {
            if (this.stack.endpoint) {
                return `/compose/${this.stack.name}/${this.stack.endpoint}`;
            } else {
                return `/compose/${this.stack.name}`;
            }
        },
        depthMargin() {
            return {
                marginLeft: `${31 * this.depth}px`,
            };
        },
        stackName() {
            return this.stack.name;
        },
        portList() {
            if (!this.stack.ports || this.stack.ports.length === 0) {
                return [];
            }
            return this.stack.ports.map(raw => {
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
            });
        },
        displayPorts() {
            return this.portList.slice(0, MAX_VISIBLE_PORTS);
        },
        overflowCount() {
            return Math.max(0, this.portList.length - MAX_VISIBLE_PORTS);
        }
    },
    watch: {
        isSelectMode() {
            // TODO: Resize the heartbeat bar, but too slow
            // this.$refs.heartbeatBar.resize();
        }
    },
    beforeMount() {

    },
    methods: {
        /**
         * Changes the collapsed value of the current stack and saves
         * it to local storage
         * @returns {void}
         */
        changeCollapsed() {
            this.isCollapsed = !this.isCollapsed;

            // Save collapsed value into local storage
            let storage = window.localStorage.getItem("stackCollapsed");
            let storageObject = {};
            if (storage !== null) {
                storageObject = JSON.parse(storage);
            }
            storageObject[`stack_${this.stack.id}`] = this.isCollapsed;

            window.localStorage.setItem("stackCollapsed", JSON.stringify(storageObject));
        },

        /**
         * Toggle selection of stack
         * @returns {void}
         */
        toggleSelection() {
            if (this.isSelected(this.stack.id)) {
                this.deselect(this.stack.id);
            } else {
                this.select(this.stack.id);
            }
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.small-padding {
    padding-left: 5px !important;
    padding-right: 5px !important;
}

.collapse-padding {
    padding-left: 8px !important;
    padding-right: 2px !important;
}

.item {
    text-decoration: none;
    display: flex;
    align-items: center;
    min-height: 52px;
    border-radius: 10px;
    transition: all ease-in-out 0.15s;
    width: 100%;
    padding: 5px 8px;
    &.disabled {
        opacity: 0.3;
    }
    &:hover {
        background-color: $highlight-white;
    }
    &.active {
        background-color: #cdf8f4;
    }
    .title-and-ports {
        display: flex;
        flex-direction: column;
        min-width: 0;

        .title {
            margin-top: -4px;
            font-size: 0.95rem;
            font-weight: 600;
        }

        .ports {
            display: flex;
            flex-wrap: wrap;
            gap: 3px;
            margin-top: 2px;
        }
    }
    .endpoint {
        font-size: 12px;
        color: $dark-font-color3;
    }
}

.port-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: $primary;
    align-self: center;
}

.port-badge {
    font-size: 0.7rem;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 4px;
    background-color: rgba(116, 194, 255, 0.15);
    color: $primary;
}

.port-overflow {
    opacity: 0.7;
}

.host-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 4px;
    background-color: rgba($warning, 0.15);
    color: $warning;
}

.collapsed {
    transform: rotate(-90deg);
}

.animated {
    transition: all 0.2s $easing-in;
}

.select-input-wrapper {
    float: left;
    margin-top: 15px;
    margin-left: 3px;
    margin-right: 10px;
    padding-left: 4px;
    position: relative;
    z-index: 15;
}

.dim {
    opacity: 0.5;
}

</style>

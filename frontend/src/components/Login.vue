<template>
    <div class="form-container">
        <div class="form">
            <form @submit.prevent="submit">
                <h1 class="h3 mb-3 fw-normal" />

                <div v-if="!tokenRequired" class="form-floating">
                    <input id="floatingInput" v-model="username" type="text" class="form-control" placeholder="Username" autocomplete="username" required>
                    <label for="floatingInput">{{ $t("Username") }}</label>
                </div>

                <div v-if="!tokenRequired" class="form-floating mt-3">
                    <input id="floatingPassword" v-model="password" type="password" class="form-control" placeholder="Password" autocomplete="current-password" required>
                    <label for="floatingPassword">{{ $t("Password") }}</label>
                </div>

                <div v-if="tokenRequired">
                    <div class="form-floating mt-3">
                        <input id="otp" v-model="token" type="text" maxlength="6" class="form-control" placeholder="123456" autocomplete="one-time-code" required>
                        <label for="otp">{{ $t("Token") }}</label>
                    </div>
                </div>

                <div class="form-check mb-3 mt-3 d-flex justify-content-center pe-4">
                    <div class="form-check">
                        <input id="remember" v-model="$root.remember" type="checkbox" value="remember-me" class="form-check-input">

                        <label class="form-check-label" for="remember">
                            {{ $t("Remember me") }}
                        </label>
                    </div>
                </div>
                <div v-if="siteKey" id="turnstile-widget" ref="turnstile" class="mt-3 mb-3"></div>

                <button class="w-100 btn btn-primary" type="submit" :disabled="processing">
                    {{ $t("Login") }}
                </button>

                <div v-if="res && !res.ok" class="alert alert-danger mt-3" role="alert">
                    {{ $t(res.msg) }}
                </div>
            </form>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            processing: false,
            username: "",
            password: "",
            token: "",
            res: null,
            tokenRequired: false,
            captchaToken: "",
            siteKey: "",
        };
    },

    mounted() {

        this.getTurnstileSiteKey();
        document.title += " - Login";
    },

    unmounted() {
        document.title = document.title.replace(" - Login", "");
    },

    methods: {
        /**
         * Submit the user details and attempt to log in
         * @returns {void}
         */
        submit() {
            this.processing = true;

            if (this.siteKey && !this.captchaToken) {
                this.processing = false;
                this.res = { ok: false,
                    msg: "Invalid CAPTCHA!" };
                this.resetTurnstile(); // Reset the widget
                return;
            }

            this.$root.login(this.username, this.password, this.token, this.captchaToken, (res) => {
                this.processing = false;
                if (res.tokenRequired) {
                    this.tokenRequired = true;
                } else if (!res.ok) {
                    this.res = res;
                    this.resetTurnstile();
                } else {
                    this.res = res;
                }
            });
        },

        resetTurnstile() {
            if (window.turnstile && this.$refs.turnstile) {
                window.turnstile.reset(this.$refs.turnstile);
                this.captchaToken = "";
            }
        },

        getTurnstileSiteKey() {
            this.$root.getTurnstileSiteKey((res) => {
                if (res.ok && res.siteKey) {
                    this.siteKey = res.siteKey;
                    if (window.turnstile) {
                        this.initializeTurnstile();
                        return;
                    }
                    if (document.querySelector("script[src*=\"turnstile\"]")) {
                        return;
                    }
                    const script = document.createElement("script");
                    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
                    script.async = true;
                    script.defer = true;
                    script.onload = () => {
                        this.initializeTurnstile();
                    };
                    script.onerror = () => {
                        this.siteKey = "";
                    };
                    document.head.appendChild(script);
                }
            });
        },

        initializeTurnstile() {
            if (window.turnstile && this.$refs.turnstile) {
                window.turnstile.render(this.$refs.turnstile, {
                    sitekey: this.siteKey,
                    callback: (token) => {
                        this.captchaToken = token;
                    },
                    "error-callback": () => {
                        this.captchaToken = "";
                    },
                });
            }
        },

    },
};
</script>

<style lang="scss" scoped>
.form-container {
    display: flex;
    align-items: center;
    padding-top: 40px;
    padding-bottom: 40px;
}

.form-floating {
    > label {
        padding-left: 1.3rem;
    }

    > .form-control {
        padding-left: 1.3rem;
    }
}

.form {
    width: 100%;
    max-width: 330px;
    padding: 15px;
    margin: auto;
    text-align: center;
}
</style>

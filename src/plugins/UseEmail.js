import Vue from 'vue';

export default Vue.extend({
  data() {
    return {
      submitted: false,
      loading: false,
      error: null,
    };
  },
  methods: {
    sendEmail(endpointUrl, data) {
      this.loading = true;
      this.submitted = false;
      this.error = null;

      fetch(endpointUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then((response) => {
          // Endpoint thinks that it's likely a spam/bot request, you need to change "spam protection mode" to "never" in HeroTofu forms
          if (response.status === 422) {
            throw new Error("Are you robot?");
          }

          if (response.status !== 200) {
            throw new Error(`${response.statusText} (${response.status})`);
          }

          return response.json();
        })
        .then(() => {
          this.submitted = true;
          this.loading = false;
        })
        .catch((err) => {
          this.error = err.toString();
          this.loading = false;
        });
    }
  }
});
/**
 * TaskVault Cloud Configuration & AWS Gateway State Manager
 */

const CONFIG = {
    // Default to empty string for Local Mock Demo mode, or replace with deployed API Gateway URL
    // e.g. "https://abc123xyz.execute-api.us-east-1.amazonaws.com/Prod"
    API_GATEWAY_URL: localStorage.getItem('TASKVAULT_AWS_API_URL') || "",
    
    // Check if live AWS endpoint is set
    isLiveAWS() {
        return Boolean(this.API_GATEWAY_URL && this.API_GATEWAY_URL.trim().length > 0);
    },

    // Save AWS API Gateway endpoint
    setApiGatewayUrl(url) {
        this.API_GATEWAY_URL = url ? url.trim() : "";
        if (this.API_GATEWAY_URL) {
            localStorage.setItem('TASKVAULT_AWS_API_URL', this.API_GATEWAY_URL);
        } else {
            localStorage.removeItem('TASKVAULT_AWS_API_URL');
        }
    }
};

window.CONFIG = CONFIG;

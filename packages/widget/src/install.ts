/**
 * Standalone installer script for easy script tag installation
 * This script automatically loads CSS and JS, then initializes the widget
 * if configuration is provided via window.siteAgentConfig
 */

interface SiteAgentInstallConfig {
  version?: string;
  cdn?: "unpkg" | "jsdelivr";
  cssUrl?: string;
  jsUrl?: string;
  target?: string | HTMLElement;
  config?: any;
  autoInit?: boolean;
}

declare global {
  interface Window {
    siteAgentConfig?: SiteAgentInstallConfig;
    ChatWidget?: any;
  }
}

(function() {
  "use strict";

  // Prevent double installation
  if ((window as any).__siteAgentInstallerLoaded) {
    return;
  }
  (window as any).__siteAgentInstallerLoaded = true;

  const config: SiteAgentInstallConfig = window.siteAgentConfig || {};
  const version = config.version || "latest";
  const cdn = config.cdn || "jsdelivr";
  const autoInit = config.autoInit !== false; // Default to true

  // Determine CDN base URL
  const getCdnBase = () => {
    if (config.cssUrl && config.jsUrl) {
      return { cssUrl: config.cssUrl, jsUrl: config.jsUrl };
    }
    
    const packageName = "site-agent";
    const basePath = `/npm/${packageName}@${version}/dist`;
    
    if (cdn === "unpkg") {
      return {
        cssUrl: `https://unpkg.com${basePath}/widget.css`,
        jsUrl: `https://unpkg.com${basePath}/index.global.js`
      };
    } else {
      return {
        cssUrl: `https://cdn.jsdelivr.net${basePath}/widget.css`,
        jsUrl: `https://cdn.jsdelivr.net${basePath}/index.global.js`
      };
    }
  };

  const { cssUrl, jsUrl } = getCdnBase();

  // Check if CSS is already loaded
  const isCssLoaded = () => {
    return !!document.head.querySelector('link[data-site-agent]') ||
           !!document.head.querySelector(`link[href*="widget.css"]`);
  };

  // Check if JS is already loaded
  const isJsLoaded = () => {
    return !!(window as any).ChatWidget;
  };

  // Load CSS
  const loadCSS = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (isCssLoaded()) {
        resolve();
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssUrl;
      link.setAttribute("data-site-agent", "true");
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS from ${cssUrl}`));
      document.head.appendChild(link);
    });
  };

  // Load JS
  const loadJS = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (isJsLoaded()) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = jsUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load JS from ${jsUrl}`));
      document.head.appendChild(script);
    });
  };

  // Initialize widget
  const initWidget = () => {
    if (!window.ChatWidget || !window.ChatWidget.initChatWidget) {
      console.warn("ChatWidget not available. Make sure the script loaded successfully.");
      return;
    }

    const target = config.target || "body";
    // Merge apiUrl from top-level config into widget config if present
    const widgetConfig = { ...config.config };
    if ((config as any).apiUrl && !widgetConfig.apiUrl) {
      widgetConfig.apiUrl = (config as any).apiUrl;
    }

    // Only initialize if config is provided
    if (!widgetConfig.apiUrl && Object.keys(widgetConfig).length === 0) {
      return;
    }

    try {
      window.ChatWidget.initChatWidget({
        target,
        config: widgetConfig
      });
    } catch (error) {
      console.error("Failed to initialize ChatWidget:", error);
    }
  };

  // Main installation flow
  const install = async () => {
    try {
      await loadCSS();
      await loadJS();
      
      if (autoInit && (config.config || (config as any).apiUrl)) {
        // Wait a tick to ensure ChatWidget is fully initialized
        setTimeout(initWidget, 0);
      }
    } catch (error) {
      console.error("Failed to install ChatWidget:", error);
    }
  };

  // Start installation
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();


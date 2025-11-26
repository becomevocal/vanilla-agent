import type { ComponentRenderer } from "vanilla-agent";

/**
 * ProductCard component - displays product information
 */
export const ProductCard: ComponentRenderer = (props, context) => {
  const card = document.createElement("div");
  card.className = "product-card";
  card.style.cssText = `
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    max-width: 400px;
    margin: 1rem 0;
  `;

  const title = String(props.title || "Product Name");
  const price = typeof props.price === "number" ? props.price : 0;
  const image = String(props.image || "");
  const description = String(props.description || "");

  card.innerHTML = `
    ${image ? `<img src="${image}" alt="${title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px; margin-bottom: 1rem;" />` : ""}
    <h3 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1.25rem;">${title}</h3>
    ${description ? `<p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">${description}</p>` : ""}
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 1.5rem; font-weight: bold; color: #2196f3;">$${price.toFixed(2)}</span>
      <button style="
        background: #2196f3;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
      ">Add to Cart</button>
    </div>
  `;

  return card;
};

/**
 * SimpleChart component - displays a basic bar chart
 */
export const SimpleChart: ComponentRenderer = (props, context) => {
  const chart = document.createElement("div");
  chart.className = "simple-chart";
  chart.style.cssText = `
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    max-width: 500px;
    margin: 1rem 0;
  `;

  const title = String(props.title || "Chart");
  const data = Array.isArray(props.data) ? props.data : [];
  const labels = Array.isArray(props.labels) ? props.labels : [];

  // Calculate max value for scaling
  const maxValue = data.length > 0 
    ? Math.max(...(data as number[]).map(v => typeof v === "number" ? v : 0))
    : 100;

  chart.innerHTML = `
    <h3 style="margin: 0 0 1rem 0; color: #333; font-size: 1.25rem;">${title}</h3>
    <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 200px; border-bottom: 2px solid #e0e0e0;">
      ${data.map((value, index) => {
        const numValue = typeof value === "number" ? value : 0;
        const height = (numValue / maxValue) * 100;
        const label = labels[index] || `Item ${index + 1}`;
        return `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%;">
            <div style="
              width: 100%;
              background: linear-gradient(to top, #2196f3, #64b5f6);
              height: ${height}%;
              min-height: ${height > 0 ? "4px" : "0"};
              border-radius: 4px 4px 0 0;
              margin-bottom: 0.5rem;
              transition: height 0.3s ease;
            "></div>
            <div style="font-size: 0.75rem; color: #666; text-align: center; transform: rotate(-45deg); transform-origin: center; white-space: nowrap;">
              ${label}
            </div>
            <div style="font-size: 0.8rem; font-weight: bold; color: #333; margin-top: 0.25rem;">
              ${numValue}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  return chart;
};

/**
 * StatusBadge component - displays a status badge with color coding
 */
export const StatusBadge: ComponentRenderer = (props, context) => {
  const badge = document.createElement("div");
  badge.className = "status-badge";
  
  const status = String(props.status || "unknown").toLowerCase();
  const message = String(props.message || status);
  
  const colorMap: Record<string, string> = {
    success: "#4caf50",
    error: "#f44336",
    warning: "#ff9800",
    info: "#2196f3",
    pending: "#9e9e9e"
  };
  
  const color = colorMap[status] || colorMap.info;
  
  badge.style.cssText = `
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    background: ${color}20;
    color: ${color};
    border: 1px solid ${color};
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0.5rem 0;
  `;
  
  badge.textContent = message;
  
  return badge;
};

/**
 * InfoCard component - displays information in a card format
 */
export const InfoCard: ComponentRenderer = (props, context) => {
  const card = document.createElement("div");
  card.className = "info-card";
  card.style.cssText = `
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 400px;
    margin: 1rem 0;
  `;

  const title = String(props.title || "Information");
  const content = String(props.content || "");
  const icon = String(props.icon || "ℹ️");

  card.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
      <span style="font-size: 2rem;">${icon}</span>
      <h3 style="margin: 0; font-size: 1.5rem;">${title}</h3>
    </div>
    ${content ? `<p style="margin: 0; line-height: 1.6; opacity: 0.95;">${content}</p>` : ""}
  `;

  return card;
};

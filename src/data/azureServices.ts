import type { AzureService, AzureLocation } from "@/types";

// Custom Azure-styled SVG icons as data URIs
// Azure brand colors: Primary Blue #0078D4, Light Blue #50E6FF, Dark Blue #002050

const webAppIcon = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
  <defs>
    <linearGradient id="webAppGrad" x1="9" y1="15.83" x2="9" y2="5.79" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0078d4"/>
      <stop offset="1" stop-color="#5ea0ef"/>
    </linearGradient>
  </defs>
  <path fill="url(#webAppGrad)" d="M0 3.25A3.25 3.25 0 0 1 3.25 0h11.5A3.25 3.25 0 0 1 18 3.25v11.5A3.25 3.25 0 0 1 14.75 18H3.25A3.25 3.25 0 0 1 0 14.75V3.25z"/>
  <path fill="#fff" d="M9 3a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm4.47 5.5h-1.72a9.14 9.14 0 0 0-.56-3.12A4.52 4.52 0 0 1 13.47 8.5zm-4 4.44c-.68-.61-1.22-1.87-1.4-3.44h2.86c-.18 1.57-.72 2.83-1.4 3.44zm-1.47-4.44a8.26 8.26 0 0 1 1.47-3.44A8.26 8.26 0 0 1 10.94 8.5zm1.47-3.44c.68.61 1.22 1.87 1.4 3.44H7.53c.18-1.57.72-2.83 1.4-3.44zM6.81 5.38a9.14 9.14 0 0 0-.56 3.12H4.53a4.52 4.52 0 0 1 2.28-3.12zM4.53 9.5h1.72a9.14 9.14 0 0 0 .56 3.12A4.52 4.52 0 0 1 4.53 9.5zm6.66 3.12a9.14 9.14 0 0 0 .56-3.12h1.72a4.52 4.52 0 0 1-2.28 3.12z"/>
</svg>
`)}`;

const sqlDatabaseIcon = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
  <defs>
    <linearGradient id="sqlGrad" x1="9" y1="17" x2="9" y2="1" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0078d4"/>
      <stop offset="1" stop-color="#5ea0ef"/>
    </linearGradient>
  </defs>
  <ellipse cx="9" cy="4" rx="7" ry="2.5" fill="#50e6ff"/>
  <path fill="url(#sqlGrad)" d="M2 4v10c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V4c0 1.38-3.13 2.5-7 2.5S2 5.38 2 4z"/>
  <ellipse cx="9" cy="4" rx="7" ry="2.5" fill="none" stroke="#fff" stroke-width=".3" opacity=".5"/>
  <path fill="none" stroke="#fff" stroke-width=".5" opacity=".3" d="M2 8c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5M2 12c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5"/>
</svg>
`)}`;

const documentIntelligenceIcon = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><defs><linearGradient id="dg" x1="9" y1="17" x2="9" y2="1" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0078d4"/><stop offset="1" stop-color="#5ea0ef"/></linearGradient></defs><rect x="2" y="1" width="11" height="16" rx="1.5" fill="url(#dg)"/><polygon points="13,1 13,5 17,5" fill="#50e6ff"/><path d="M13 1l4 4h-3.5a.5.5 0 0 1-.5-.5V1z" fill="#83d4ff"/><rect x="4" y="7" width="6" height="1.5" rx=".5" fill="#fff"/><rect x="4" y="10" width="4" height="1.5" rx=".5" fill="#fff"/><rect x="4" y="13" width="5" height="1.5" rx=".5" fill="#fff"/><circle cx="14" cy="14" r="3.5" fill="#50e6ff"/><path d="M12.5 14l1.2 1.8 2.3-3" stroke="#0078d4" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
)}`;

const serviceBusIcon = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
  <defs>
    <linearGradient id="busGrad" x1="9" y1="17" x2="9" y2="1" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0078d4"/>
      <stop offset="1" stop-color="#5ea0ef"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="16" height="16" rx="2" fill="url(#busGrad)"/>
  <rect x="3" y="4" width="12" height="2.5" rx=".5" fill="#fff"/>
  <rect x="3" y="7.75" width="12" height="2.5" rx=".5" fill="#fff"/>
  <rect x="3" y="11.5" width="12" height="2.5" rx=".5" fill="#fff"/>
  <circle cx="5" cy="5.25" r="1" fill="#50e6ff"/>
  <circle cx="5" cy="9" r="1" fill="#50e6ff"/>
  <circle cx="5" cy="12.75" r="1" fill="#50e6ff"/>
  <path fill="#50e6ff" d="M8 4.5h5.5v1.5H8zM8 8.25h5.5v1.5H8zM8 12h5.5v1.5H8z"/>
</svg>
`)}`;

export const azureServices: AzureService[] = [
  {
    id: "web-app",
    name: "Azure Web App",
    category: "compute",
    icon: webAppIcon,
    tfResourceType: "azurerm_linux_web_app",
    description: "Build and host web applications",
    docs_url:
      "/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app",
    dependencies: ["azurerm_service_plan"],
    useMinimalConfig: true,
  },
  {
    id: "document-intelligence",
    name: "Document Intelligence",
    category: "ai",
    icon: documentIntelligenceIcon,
    tfResourceType: "azurerm_cognitive_account",
    description: "AI-powered document processing",
    docs_url:
      "/modules/Azure/avm-res-cognitiveservices-account/azurerm/latest/examples/Azure-AI-Document-Intelligence",
    useMinimalConfig: true,
  },
  {
    id: "service-bus",
    name: "Azure Service Bus Queue",
    category: "integration",
    icon: serviceBusIcon,
    tfResourceType: "azurerm_servicebus_queue",
    description: "Enterprise messaging queue (namespace auto-created)",
    docs_url:
      "/providers/hashicorp/azurerm/latest/docs/resources/servicebus_queue",
    useMinimalConfig: true,
  },
  {
    id: "sql-database",
    name: "Azure SQL Database",
    category: "database",
    icon: sqlDatabaseIcon,
    tfResourceType: "azurerm_mssql_database",
    description: "Managed relational SQL database",
    docs_url:
      "providers/hashicorp/azurerm/latest/docs/resources/mssql_database",
    dependencies: ["azurerm_mssql_server"],
    useMinimalConfig: true,
  },
];

export const azureLocations: AzureLocation[] = [
  { value: "eastus", label: "East US" },
  { value: "eastus2", label: "East US 2" },
  { value: "westus", label: "West US" },
  { value: "westus2", label: "West US 2" },
  { value: "centralus", label: "Central US" },
  { value: "northeurope", label: "North Europe" },
  { value: "westeurope", label: "West Europe" },
  { value: "uksouth", label: "UK South" },
  { value: "ukwest", label: "UK West" },
  { value: "southeastasia", label: "Southeast Asia" },
  { value: "eastasia", label: "East Asia" },
  { value: "australiaeast", label: "Australia East" },
];

export function getServiceById(id: string): AzureService | undefined {
  return azureServices.find((service) => service.id === id);
}

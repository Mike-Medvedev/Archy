import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Custom blue that matches Azure/Archy brand
const archyBlue: MantineColorsTuple = [
  "#e6f4ff",
  "#cce8ff",
  "#99d1ff",
  "#66b8ff",
  "#339fff",
  "#0078d4", // Primary
  "#006cbd",
  "#005a9e",
  "#004578",
  "#003052",
];

export const theme = createTheme({
  primaryColor: "archyBlue",
  colors: {
    archyBlue,
  },
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  headings: {
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    fontWeight: "600",
  },
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
  },
  defaultRadius: "md",
  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
    md: "0 4px 6px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)",
    lg: "0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04)",
    xl: "0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
        shadow: "sm",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "sm",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Badge: {
      defaultProps: {
        radius: "sm",
      },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: "var(--mantine-radius-md)",
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
      },
    },
  },
});

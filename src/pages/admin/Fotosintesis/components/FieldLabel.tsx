import { Box } from "@mui/material";
import { getFoto } from "../../../../design-system";

interface FieldLabelProps {
  children: React.ReactNode;
  /** Right-aligned optional hint (e.g. "opcional pero recomendado"). */
  optional?: React.ReactNode;
  htmlFor?: string;
}

/**
 * Uppercase 9px label with optional right-side hint. Used above every input in
 * the captura panes (handoff §3.6).
 */
export function FieldLabel({ children, optional, htmlFor }: FieldLabelProps) {
  const foto = getFoto("light");
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 1,
        marginBottom: "6px",
      }}
    >
      <Box
        component="label"
        htmlFor={htmlFor}
        sx={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: foto.ink.tertiary,
        }}
      >
        {children}
      </Box>
      {optional ? (
        <Box
          sx={{
            fontSize: 10.5,
            color: foto.ink.mute,
            fontStyle: "italic",
          }}
        >
          {optional}
        </Box>
      ) : null}
    </Box>
  );
}

export default FieldLabel;

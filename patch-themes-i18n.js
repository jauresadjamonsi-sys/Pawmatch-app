const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "lib", "contexts", "AppContext.tsx");

let code = fs.readFileSync(file, "utf8");

// Ajouter --c-accent à chaque thème sombre
code = code.replace(
  `nuit:   { "--c-deep": "#0f0c1a", "--c-nav": "#130f22", "--c-card": "#1e1830", "--c-border": "#2d2545", "--c-text": "#f0eeff", "--c-text-muted": "#9b93b8" }`,
  `nuit:   { "--c-deep": "#0f0c1a", "--c-nav": "#130f22", "--c-card": "#1e1830", "--c-border": "#2d2545", "--c-text": "#f0eeff", "--c-text-muted": "#9b93b8", "--c-accent": "#A78BFA" }`
);
code = code.replace(
  `aurore: { "--c-deep": "#1a0f05", "--c-nav": "#150c04", "--c-card": "#261508", "--c-border": "#3d2510", "--c-text": "#fff0e0", "--c-text-muted": "#b89070" }`,
  `aurore: { "--c-deep": "#1a0f05", "--c-nav": "#150c04", "--c-card": "#261508", "--c-border": "#3d2510", "--c-text": "#fff0e0", "--c-text-muted": "#b89070", "--c-accent": "#F59E0B" }`
);
code = code.replace(
  `ocean:  { "--c-deep": "#080f1a", "--c-nav": "#060d18", "--c-card": "#0d1a2e", "--c-border": "#152840", "--c-text": "#e0f0ff", "--c-text-muted": "#7099bb" }`,
  `ocean:  { "--c-deep": "#080f1a", "--c-nav": "#060d18", "--c-card": "#0d1a2e", "--c-border": "#152840", "--c-text": "#e0f0ff", "--c-text-muted": "#7099bb", "--c-accent": "#38BDF8" }`
);

fs.writeFileSync(file, code);
console.log("✅ AppContext.tsx patché — --c-accent ajouté aux 3 thèmes sombres");

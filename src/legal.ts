// Entry point for the standalone legal pages. They deliberately work
// without the app bundle, but should still adopt the theme the visitor
// picked on the main site.
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./themes.css";
import "./legal.css";

const THEMES = ["atlas", "swiss", "dark", "vintage"];
const stored = localStorage.getItem("ktw-theme");
if (stored && THEMES.includes(stored)) {
  document.documentElement.dataset.theme = stored;
}

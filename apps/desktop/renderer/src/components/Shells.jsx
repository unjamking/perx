// Electron provides the real OS window (hiddenInset titlebar = native traffic lights),
// so the shell is just a full-bleed flex container holding sidebar + main.
export function DesktopShell({ children }) {
  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: "var(--bg)",
      // leave room for the native traffic lights on macOS hiddenInset
      paddingTop: "env(titlebar-area-height, 0px)",
    }}>
      {children}
    </div>
  );
}

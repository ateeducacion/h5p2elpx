export function Footer() {
  return (
    <footer
      style={{
        marginTop: "3rem",
        padding: "1.5rem 0",
        borderTop: "1px solid #e5e5e5",
        textAlign: "center",
        color: "#666",
        fontSize: "0.9em"
      }}
    >
      Made with <span style={{ color: "#e25555" }}>❤</span> by{" "}
      <a
        href="https://www3.gobiernodecanarias.org/medusa/ecoescuela/ate/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", textDecoration: "underline" }}
      >
        Área de Tecnología Educativa
      </a>
    </footer>
  );
}

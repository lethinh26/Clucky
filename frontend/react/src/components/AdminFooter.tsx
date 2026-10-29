import { Layout } from "antd";

export function AdminFooter() {
  return (
    <Layout.Footer
      data-loading-shell="bottom"
      style={{
        textAlign: "center",
        background: "#F5EDE0",
        borderTop: "1px solid #E8E2D9",
        padding: "16px 24px",
        color: "#6B6259",
        fontFamily: "Quicksand, sans-serif",
        fontSize: 13,
      }}
    >
      Clucky · Hệ thống quản trị ·{" "}
      <span style={{ color: "#8F1216", fontWeight: 700 }}>
        Crispy Outside, Happy Inside
      </span>
    </Layout.Footer>
  );
}

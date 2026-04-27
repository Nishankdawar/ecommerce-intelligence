import "./globals.css";
import SidebarLayout from "@/components/SidebarLayout";

export const metadata = {
  title: "Ecommerce Intelligence",
  description: "Amazon Seller Intelligence POC",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/lib/components/AuthGuard/AuthGuard";
import SidebarV2 from "../../lib/PageComponent/SidebarV2";
import "@/lib/styles/main_content.scss";
export default function Layout({ children }) {
  const [activeLink, setActiveLink] = useState("");
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/recruiter-dashboard",
      icon: "la la-chart-area",
    },
    {
      label: "Careers",
      href: "/recruiter-dashboard/careers",
      icon: "la la-suitcase",
    },
    {
      label: "Candidates",
      href: "/recruiter-dashboard/candidates",
      icon: "la la-id-badge",
    },
    { label: "To Do", href: "/recruiter-dashboard/to-do", icon: "la la-cogs" },
  ];

  const footerNavItems = [
    {
      label: "Feedback",
      href: "/recruiter-dashboard/feedback",
      icon: "la la-comments",
    },
    {
      label: "Members",
      href: "/recruiter-dashboard/members",
      icon: "la la-users",
    },
    {
      label: "Settings",
      href: "/recruiter-dashboard/settings",
      icon: "la la-cog",
    },
  ];

  const superAdminNavItems = [
    {
      label: "Inbox",
      href: "/recruiter-dashboard/inbox",
      icon: "la la-envelope",
    },
  ];

  useEffect(() => {
    if (pathname) {
      const pathSplit = pathname.split("/");
      const allLinks = [...navItems, ...footerNavItems, ...superAdminNavItems];

      let activeMenu = null;
      if (pathSplit.length <= 3) {
        activeMenu = allLinks.find((x) => x.href === pathname);
      } else {
        const path = "/" + pathSplit[1] + "/" + pathSplit[2];
        activeMenu = allLinks.find((x) => x.href === path);
      }

      if (!activeMenu) {
        activeMenu = allLinks.find(
          (x) => x.href === "/recruiter-dashboard/careers"
        );
      }

      setActiveLink(activeMenu.label);
    }
  }, [pathname]);

  return (
    <>
      <AuthGuard />
      <div
        className="g-sidenav-show g-sidenav-pinned"
        style={{
          minHeight: "100vh",
          overflowY: "auto", // outer scroll
          backgroundColor: "#f8f9fa", // light gray background
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <title>Jia - WhiteCloak Technologies</title>

        <SidebarV2
          activeLink={activeLink}
          navItems={navItems}
          footerNavItems={footerNavItems}
          superAdminNavItems={superAdminNavItems}
        />

        {/* Main content card */}
        <div
          className="main-content bg-white rounded-2xl shadow-md"
          id="panel"
        >
          {children}
        </div>
      </div>
    </>
  );
}

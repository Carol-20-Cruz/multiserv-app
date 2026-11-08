import React from "react";

export interface SubItem {
  label: string;
  path: string;
  target?: string;
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  target?: string;
  subItems?: SubItem[];
}

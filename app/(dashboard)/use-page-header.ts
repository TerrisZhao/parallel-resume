"use client";

import { useContext } from "react";

import { PageHeaderContext } from "./page-header-context";

export const usePageHeader = () => useContext(PageHeaderContext);

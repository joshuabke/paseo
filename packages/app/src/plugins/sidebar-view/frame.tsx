import { SidebarAgentListSkeleton } from "@/components/sidebar-agent-list-skeleton";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { SidebarViewSelectionState } from "./selection";

export function SidebarViewFrame({
  state,
  fallback,
  children,
  header,
  reload,
}: {
  state: SidebarViewSelectionState;
  fallback: ReactNode;
  children: ReactNode;
  header?: ReactNode;
  reload(): void;
}) {
  const { t } = useTranslation();
  if (state.status === "ready" && children == null) return fallback;
  let body = children;
  if (state.status === "loading") body = <SidebarAgentListSkeleton />;
  if (state.status === "error")
    body = (
      <View style={styles.failure}>
        <Text style={styles.text}>{t("sidebar.view.readFailed")}</Text>
        <Button onPress={reload}>{t("common.actions.retry")}</Button>
      </View>
    );
  return (
    <>
      {header}
      {body}
    </>
  );
}
const styles = StyleSheet.create((theme) => ({
  failure: { padding: theme.spacing[4], gap: theme.spacing[3] },
  text: { color: theme.colors.foreground },
}));

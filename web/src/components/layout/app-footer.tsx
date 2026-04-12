export function AppFooter(): JSX.Element {
  return (
    <footer className="relative z-10 border-t border-border/70 bg-card/50 px-4 py-4 backdrop-blur md:px-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>V-Mind • Bitcoin-native strategy infrastructure on Stacks</p>
        <p>Security-first operations and transparent on-chain execution</p>
      </div>
    </footer>
  );
}

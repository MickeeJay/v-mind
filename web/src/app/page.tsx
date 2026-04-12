import { ArrowUpRight, BadgeCheck, ShieldCheck, TrendingUp, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const positions = [
  {
    vault: 'VM-ALEX-01',
    strategy: 'Yield Rotation',
    tvl: '$124,220',
    apy: '16.4%',
    risk: 'Moderate',
  },
  {
    vault: 'VM-HERM-02',
    strategy: 'Delta Neutral',
    tvl: '$89,410',
    apy: '11.2%',
    risk: 'Low',
  },
  {
    vault: 'VM-SDAO-03',
    strategy: 'BTC Yield Stack',
    tvl: '$208,005',
    apy: '19.8%',
    risk: 'Elevated',
  },
];

export default function Home(): JSX.Element {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-2xl border border-border/70 bg-gradient-to-br from-card/80 via-card/60 to-bitcoin-500/10 p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bitcoin-300">Built on Stacks</p>
        <h1 className="max-w-3xl font-[var(--font-display)] text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Automated Vault Strategies with On-Chain Precision
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          V-Mind delivers trust-first strategy automation for Bitcoin-native DeFi participants. Monitor vault health,
          manage risk boundaries, and execute actions with transparent protocol controls.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button className="bg-bitcoin-500 text-bitcoin-950 hover:bg-bitcoin-400">
            Open Vault Console
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline">Review Risk Controls</Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-3">
            <CardDescription>Total Value Managed</CardDescription>
            <CardTitle className="text-2xl">$421,635</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-success">
            <TrendingUp className="h-4 w-4" />
            +8.4% from last epoch
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-3">
            <CardDescription>Active Guardrails</CardDescription>
            <CardTitle className="text-2xl">12</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-bitcoin-300">
            <ShieldCheck className="h-4 w-4" />
            Circuit breakers online
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader className="pb-3">
            <CardDescription>Execution Alerts</CardDescription>
            <CardTitle className="text-2xl">2</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-warning">
            <TriangleAlert className="h-4 w-4" />
            Rebalance required
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="bg-muted/70">
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="allocator">Allocator</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Vault Positions</CardTitle>
              <CardDescription>Current strategy allocations and projected performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vault</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>TVL</TableHead>
                    <TableHead>Projected APY</TableHead>
                    <TableHead>Risk Band</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.vault}>
                      <TableCell className="font-medium">{position.vault}</TableCell>
                      <TableCell>{position.strategy}</TableCell>
                      <TableCell>{position.tvl}</TableCell>
                      <TableCell>{position.apy}</TableCell>
                      <TableCell>{position.risk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocator">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Capital Allocator</CardTitle>
              <CardDescription>Set target capital and strategy profile for the next epoch.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capital">Target Capital (USD)</Label>
                <Input id="capital" defaultValue="50000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile">Risk Profile</Label>
                <Select defaultValue="moderate">
                  <SelectTrigger id="profile">
                    <SelectValue placeholder="Choose profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                <BadgeCheck className="h-4 w-4" />
                Parameters validated. Strategy constraints remain within protocol policy.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Execution Health Feed</CardTitle>
              <CardDescription>Recent telemetry from strategy execution workers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

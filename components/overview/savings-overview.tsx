import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Home, Plane, Umbrella, Lock } from "lucide-react"

const savingsAccounts = [
  {
    id: "1",
    name: "Emergency Fund",
    currentAmount: 12000,
    targetAmount: 15000,
    monthlyContribution: 300,
    icon: Umbrella,
  },
  {
    id: "2",
    name: "Vacation Fund",
    currentAmount: 2450,
    targetAmount: 5000,
    monthlyContribution: 200,
    targetDate: "Dec 2025",
    icon: Plane,
  },
  {
    id: "3",
    name: "House Down Payment",
    currentAmount: 35000,
    targetAmount: 60000,
    monthlyContribution: 800,
    targetDate: "Jun 2026",
    icon: Home,
  },
  {
    id: "4",
    name: "Retirement",
    currentAmount: 78500,
    monthlyContribution: 500,
    icon: Briefcase,
  },
]

export function SavingsOverview() {
  return (
    <div className="relative space-y-4">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="text-center space-y-4 p-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <div>
            <Badge variant="secondary" className="text-lg px-4 py-2 mb-2">
              Coming Soon!
            </Badge>
            <h3 className="text-2xl font-bold mt-4">Savings Accounts</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Set savings goals, track contributions, and monitor your progress. This feature is currently under development.
            </p>
          </div>
        </div>
      </div>

      {/* Blurred Content */}
      <div className="pointer-events-none blur-sm opacity-50">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {savingsAccounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <account.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg font-medium">{account.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${account.currentAmount.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">${account.monthlyContribution}/month contribution</p>

                {account.targetAmount && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{Math.round((account.currentAmount / account.targetAmount) * 100)}%</span>
                    </div>
                    <Progress value={(account.currentAmount / account.targetAmount) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      ${account.currentAmount} of ${account.targetAmount} goal
                      {account.targetDate && ` • Target: ${account.targetDate}`}
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <Button size="sm" className="w-full">
                    Add Funds
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

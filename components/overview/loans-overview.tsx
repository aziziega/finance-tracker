import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Car, GraduationCap, Home, Lock } from "lucide-react"

const loans = [
  {
    id: "1",
    name: "Mortgage",
    originalAmount: 250000,
    currentBalance: 198450.32,
    interestRate: 3.25,
    monthlyPayment: 1087.62,
    nextPaymentDate: "Apr 1, 2025",
    icon: Home,
  },
  {
    id: "2",
    name: "Car Loan",
    originalAmount: 28000,
    currentBalance: 12450.75,
    interestRate: 4.5,
    monthlyPayment: 450.3,
    nextPaymentDate: "Mar 15, 2025",
    icon: Car,
  },
  {
    id: "3",
    name: "Student Loan",
    originalAmount: 45000,
    currentBalance: 22340.18,
    interestRate: 5.25,
    monthlyPayment: 380.45,
    nextPaymentDate: "Mar 21, 2025",
    icon: GraduationCap,
  },
]

export function LoansOverview() {
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
            <h3 className="text-2xl font-bold mt-4">Loans Management</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Track your loans, manage payments, and monitor interest rates. This feature is currently under development.
            </p>
          </div>
        </div>
      </div>

      {/* Blurred Content */}
      <div className="pointer-events-none blur-sm opacity-50">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => (
            <Card key={loan.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <loan.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg font-medium">{loan.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${loan.currentBalance.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {((loan.currentBalance / loan.originalAmount) * 100).toFixed(1)}% remaining • {loan.interestRate}%
                  interest
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Paid Off</span>
                    <span>{(100 - (loan.currentBalance / loan.originalAmount) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={100 - (loan.currentBalance / loan.originalAmount) * 100} className="h-2" />
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="text-sm font-medium">Next Payment</p>
                      <p className="text-xs text-muted-foreground">
                        ${loan.monthlyPayment} on {loan.nextPaymentDate}
                      </p>
                    </div>
                    <Button size="sm">Make Payment</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Wallet, Landmark, CreditCard, DollarSign } from "lucide-react"
import { useEffect, useState } from "react"
import { CategoryAccount } from "@/components/modal/modal-account"

interface Account {
  id: string
  name: string
  balance: number
  is_default: boolean
  user_id: string
}

function getAccountIcon(name: string) {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('bank') || lowerName.includes('bca') || lowerName.includes('mandiri')) {
    return Landmark
  }
  if (lowerName.includes('cash') || lowerName.includes('tunai')) {
    return DollarSign
  }
  if (lowerName.includes('credit') || lowerName.includes('kartu')) {
    return CreditCard
  }
  return Wallet // Default icon
}

export function AccountSummary() {

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounts')

      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Failed to fetch accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleAccountUpdate = () => {
    fetchAccounts()
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-7 bg-muted rounded w-32 animate-pulse" />
          <div className="h-10 bg-muted rounded w-36 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 bg-muted rounded" />
                  <div className="h-5 bg-muted rounded w-1/2" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">My Wallets</h2>
          <CategoryAccount onAccountAdded={handleAccountUpdate} />
        </div>
        <div className="text-center py-8">
          <p className="text-red-500 mb-2">Failed to load accounts</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchAccounts} className="mt-4">Retry</Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (accounts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">My Wallets</h2>
          <CategoryAccount onAccountAdded={handleAccountUpdate} />
        </div>
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No wallets yet</p>
          <p className="text-sm text-muted-foreground">
            Click "Manage Wallet" to create your first wallet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">My Wallets</h2>
        <CategoryAccount onAccountAdded={handleAccountUpdate} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const Icon = getAccountIcon(account.name)

          return (
            <Card key={account.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg font-medium">{account.name}</CardTitle>
                </div>
                {account.is_default && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {account.balance.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available Balance
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}


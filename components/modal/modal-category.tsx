"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
    id: string
    name: string
    type: string
    icon: string
    color: string
    is_system: boolean
    user_id?: string
}

export function CategoryModal() {
    const [categories, setCategories] = useState<Category[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newCategory, setNewCategory] = useState({
        name: '',
        type: 'EXPENSE',
        icon: 'circle',
        color: '#6B7280'
    })

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories')
            const data = await response.json()
            setCategories(data.categories || [])
        } catch (error) {
            toast.error('Failed to fetch categories')
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchCategories()
        }
    }, [isOpen])

    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            toast.error('Category name is required')
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategory)
            })

            if (response.ok) {
                toast.success('Category created successfully')
                setNewCategory({ name: '', type: 'EXPENSE', icon: 'circle', color: '#6B7280' })
                setShowAddForm(false)
                fetchCategories()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to create category')
            }
        } catch (error) {
            toast.error('Failed to create category')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm('Are you sure you want to delete this category?')) return

        try {
            const response = await fetch(`/api/categories/${categoryId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast.success('Category deleted successfully')
                fetchCategories()
            } else {
                const error = await response.json()
                toast.error(error.error || 'Failed to delete category')
            }
        } catch (error) {
            toast.error('Failed to delete category')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Categories
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Category Management</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Add Category Form */}
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Categories</h3>
                        <Button
                            onClick={() => setShowAddForm(!showAddForm)}
                            size="sm"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Category
                        </Button>
                    </div>

                    {showAddForm && (
                        <div className="border rounded-lg p-4 space-y-4">
                            <h4 className="font-medium">Create New Category</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="category-name">Name</Label>
                                    <Input
                                        id="category-name"
                                        value={newCategory.name}
                                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                        placeholder="Category name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="category-type">Type</Label>
                                    <Select value={newCategory.type} onValueChange={(value) => setNewCategory({ ...newCategory, type: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EXPENSE">Expense</SelectItem>
                                            <SelectItem value="INCOME">Income</SelectItem>
                                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button onClick={handleAddCategory} disabled={loading} className="w-full">
                                        {loading ? 'Creating...' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Categories List */}
                    <div className="space-y-4">
                        {['EXPENSE', 'INCOME', 'TRANSFER'].map(type => {
                            const typeCategories = categories.filter(cat => cat.type === type)

                            return (
                                <div key={type} className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-3">{type} Categories ({typeCategories.length})</h4>
                                    <div className="grid gap-2">
                                        {typeCategories.map(category => (
                                            <div key={category.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{ backgroundColor: category.color }}
                                                    />
                                                    <span className="font-medium">{category.name}</span>
                                                    {category.is_system && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            System
                                                        </Badge>
                                                    )}
                                                </div>
                                                {!category.is_system && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteCategory(category.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
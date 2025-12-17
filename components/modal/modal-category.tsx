"use client";

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
    id: string
    name: string
    type: string
    icon: string
    color: string
    is_default: boolean
    user_id?: string
}

interface CategoryModalProps {
    onCategoryAdded?: () => void
    transactionType?: string  // 'expense' | 'income' | 'transfer'
}

export function CategoryModal(props: CategoryModalProps) {
    const colorGenerate = (): string => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    const [categories, setCategories] = useState<Category[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

    // Default type berdasarkan transactionType yang aktif
    const getDefaultType = () => {
        if (props.transactionType) {
            return props.transactionType.toUpperCase()
        }
        return 'EXPENSE'
    }

    const [newCategory, setNewCategory] = useState({
        name: '',
        type: getDefaultType(),
        icon: 'circle',
        color: colorGenerate(),
    })


    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories')
            const data = await response.json()
            const normalized = (data.categories || []).map((c: any) => ({
                ...c,
                type: String(c.type || '').toUpperCase(),
                is_default: c.is_default === true || c.is_default === 'true' || c.is_default === 1,
            }))
            setCategories(normalized)
        } catch {
            toast.error('Failed to fetch categories')
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchCategories()
        }
    }, [isOpen])

    // Update form type ketika transactionType berubah
    useEffect(() => {
        if (props.transactionType) {
            setNewCategory(prev => ({
                ...prev,
                type: props.transactionType!.toUpperCase()
            }))
        }
    }, [props.transactionType])

    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            toast.error('Category name is required')
            return
        }
        if (categories.find(c => c.name.toLowerCase() === newCategory.name.trim().toLowerCase() && c.type === newCategory.type)) {
            toast.error('Category with this name and type already exists')
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
                setNewCategory({
                    name: '',
                    type: getDefaultType(), // ✅ Use getDefaultType() 
                    icon: 'circle',
                    color: colorGenerate() // ✅ Generate new color
                })
                setShowAddForm(false)
                fetchCategories()
                props.onCategoryAdded?.()
            } else {
                const error = await response.json()
                const errorMessage = error.error || 'Failed to create category'
                console.error('Error creating category:', { status: response.status, error })

                if (response.status === 401) {
                    toast.error('Please login to create categories')
                } else {
                    toast.error(errorMessage)
                }
            }
        } catch (error) {
            console.error('Failed to create category:', error)
            toast.error('Failed to create category. Please check console for details.')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteClick = (category: Category) => {
        setCategoryToDelete(category)
        setDeleteDialogOpen(true)
    }

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return

        try {
            const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast.success('Category deleted successfully')
                fetchCategories()
                props.onCategoryAdded?.()
                setDeleteDialogOpen(false)
                setCategoryToDelete(null)
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
                <DialogHeader className="mb-6 pb-2">
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
                        <div className="border rounded-lg p-4 space-y-4 bg-muted/50 ">
                            <h4 className="font-medium">Create New Category</h4>
                            <div className="flex gap-2 ">
                                <div className="flex-1">
                                    <Label htmlFor="category-name" className="mb-1">Name</Label>
                                    <Input
                                        id="category-name"
                                        value={newCategory.name}
                                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                        placeholder="Category name"
                                    />
                                </div>
                                {/* <div>
                                    <Label htmlFor="category-type">Type</Label>
                                    <Select
                                        value={newCategory.type}
                                        onValueChange={(value) => setNewCategory({ ...newCategory, type: value })}
                                        disabled={!!props.transactionType}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {props.transactionType ? (
                                                <SelectItem value={props.transactionType.toUpperCase()}>
                                                    {props.transactionType.charAt(0).toUpperCase() + props.transactionType.slice(1)}
                                                </SelectItem>
                                            ) : (
                                                <>
                                                    <SelectItem value="EXPENSE">Expense</SelectItem>
                                                    <SelectItem value="INCOME">Income</SelectItem>
                                                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div> */}
                                <div className="flex items-end ">
                                    <Button onClick={handleAddCategory} disabled={loading} className="cursor-pointer">
                                        {loading ? 'Creating...' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Categories List */}
                    <div className="space-y-4">
                        {/* Filter types: jika transactionType ada, hanya show type tersebut */}
                        {(props.transactionType
                            ? [props.transactionType.toUpperCase()]
                            : ['EXPENSE', 'INCOME', 'TRANSFER']
                        ).map(type => {
                            const typeCategories = categories.filter(cat => cat.type === type)

                            return (
                                <div key={type} className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-3">{type} Categories ({typeCategories.length})</h4>
                                    <div className="grid gap-2">
                                        {typeCategories.map(category => (
                                            <div key={category.id} className="flex items-center justify-between p-2 border rounded hover:bg-pink-950">
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{ backgroundColor: category.color }}
                                                    />
                                                    <span className="font-medium">{category.name}</span>
                                                    {category.is_default && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(category)}
                                                    className="text-red-600 hover:text-red-700 cursor-pointer"
                                                    aria-label="Delete category"
                                                    title="Delete category"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </DialogContent>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {categoryToDelete?.is_default ? (
                                <span>
                                    You are about to delete the <strong>{categoryToDelete?.name}</strong> default category.
                                    This action cannot be undone and may affect existing transactions.
                                </span>
                            ) : (
                                <span>
                                    Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>?
                                    This action cannot be undone.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCategory}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    )
}
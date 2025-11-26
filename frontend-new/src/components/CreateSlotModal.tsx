'use client'
import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
  import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,  
  } from "@/components/ui/form";
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
  import { createSlote } from '@/actions/slot'
  import { useMutation, useQueryClient } from '@tanstack/react-query'
  import { toast } from 'sonner'

const formSchema = z.object({
    date: z.date(),
    startTime: z.string(),
})

const CreateSlotModal = () => {

    const [load, setLoad] = useState(false)
    const queryClient = useQueryClient()
    const { mutate: createSlot, isPending } = useMutation({
        mutationFn: createSlote,
        onSuccess: () => {
            toast.success('Slot créé avec succès')
            queryClient.invalidateQueries({ queryKey: ['slots'] })
        },
        onError: (error: any) => {
            toast.error(error.message)
        }
    })
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            startTime: '',
        },
    })

    const onSubmit = (data: z.infer<typeof formSchema>) => {
        createSlot(data)
    }

  return (
    <div>
        <Dialog >
            <DialogContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            locale={fr}
                                            className="rounded-md border"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Heure de début</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="time" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Création...' : 'Créer le slot'}
                        </Button>
                    </form>
                </Form>
                <DialogHeader>
                    <DialogTitle>Créer un slot</DialogTitle>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    </div>
  )
}

export default CreateSlotModal

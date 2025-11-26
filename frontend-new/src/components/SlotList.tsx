'use client'
import React from 'react'
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { slotMine } from '@/actions/slot';
import CreateSlotModal from './CreateSlotModal';

const SlotList = (slots: any) => {
  const { data } = useQuery({
    queryKey: ['slots'],
    queryFn: slotMine,
    initialData: slots,
  })


 const slotsData = data.slots

  return (
    <div>
        <CreateSlotModal />
      <h1>Slot List</h1>
      <div>
        {slotsData.map((slot: any) => (
          <div key={slot._id}>{slot.startTime}</div>
        ))}
      </div>
    </div>
  )
}

export default SlotList

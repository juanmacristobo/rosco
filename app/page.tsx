'use client'
import dynamic from 'next/dynamic'

const Camara = dynamic(() => import('./Camara'), { ssr: false })

export default function Home() {
  return <Camara />
}
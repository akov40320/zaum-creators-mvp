import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Point = { name: string; count: number; color: string }
const colors: Record<string, string> = { amber: '#e7ad50', blue: '#5f9de8', violet: '#8a76db', green: '#5caf8b' }

export default function StatusChart({ data }: { data: Point[] }) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="#edf0f3" />
      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#89909b' }} interval={0} tickFormatter={value => value === 'Результаты получены' ? 'Результаты' : value} />
      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#89909b' }} />
      <Tooltip cursor={{ fill: '#f7f8fa' }} contentStyle={{ border: '1px solid #e8ebef', borderRadius: 12, boxShadow: '0 8px 28px #1c263310' }} formatter={value => [`${value} блогеров`, 'Количество']} />
      <Bar dataKey="count" radius={[6, 6, 1, 1]} barSize={42}>
        {data.map((entry, index) => <Cell key={index} fill={colors[entry.color]} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
}

export const studioSampleEvent = {
  title: '新歓飲み会',
  eventDate: '2026-06-15',
  amountPerPerson: 3000,
  paymentMethod: 'cash',
  paymentInfo: '当日受付で幹事に現金で渡してください。',
  memo: '支払いが終わったら参加者画面から報告してください。',
  adminUrl: '/admin/demo-event?token=admin-demo',
  joinUrl: '/join/demo-event?token=join-demo',
}

export const studioSampleMembers = [
  {
    id: 'sample-member-1',
    name: '真島公輝',
    status: 'unpaid',
    paymentMethod: 'cash',
    proofMemo: '',
  },
  {
    id: 'sample-member-2',
    name: '田中太郎',
    status: 'unpaid',
    paymentMethod: 'cash',
    proofMemo: '',
  },
  {
    id: 'sample-member-3',
    name: '佐々木啓介',
    status: 'unpaid',
    paymentMethod: 'cash',
    proofMemo: '',
  },
  {
    id: 'sample-member-4',
    name: '山本葵',
    status: 'reported',
    paymentMethod: 'cash',
    proofMemo: '受付で支払い済みです',
  },
  {
    id: 'sample-member-5',
    name: '鈴木さくら',
    status: 'reported',
    paymentMethod: 'cash',
    proofMemo: '現金で渡しました',
  },
  {
    id: 'sample-member-6',
    name: '高橋美咲',
    status: 'confirmed',
    paymentMethod: 'cash',
    proofMemo: '受付で確認済み',
  },
  {
    id: 'sample-member-7',
    name: '伊藤蓮',
    status: 'confirmed',
    paymentMethod: 'cash',
    proofMemo: '幹事確認済み',
  },
]

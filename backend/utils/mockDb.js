// Centralized in-memory mock database state for running without MongoDB
const mockUsers = [
  { _id: 'mock-user-1', name: 'Ahmet Yılmaz', email: 'ahmet@example.com', phone: '05551112233', role: 'user', isActive: true, emailVerified: true, createdAt: new Date() },
  { _id: 'mock-user-2', name: 'Ayşe Demir', email: 'ayse@example.com', phone: '05554445566', role: 'user', isActive: true, emailVerified: true, createdAt: new Date() },
  { _id: 'mock-user-3', name: 'Mehmet Kaya', email: 'mehmet@example.com', phone: '05557778899', role: 'user', isActive: true, emailVerified: true, createdAt: new Date() }
];

const mockAppointments = [
  {
    _id: 'mock-app-1',
    user: mockUsers[0],
    date: new Date(),
    time: '14:00',
    type: 'individual',
    status: 'scheduled',
    price: 500,
    duration: 50,
    notes: 'İlk seans',
    createdAt: new Date()
  },
  {
    _id: 'mock-app-2',
    user: mockUsers[1],
    date: new Date(),
    time: '16:00',
    type: 'couple',
    status: 'confirmed',
    price: 750,
    duration: 50,
    notes: 'Görüşme',
    createdAt: new Date()
  }
];

const mockContacts = [
  {
    _id: 'mock-msg-1',
    name: 'Ahmet Yılmaz',
    email: 'ahmet@example.com',
    phone: '05551112233',
    subject: 'Randevu Hakkında',
    message: 'Merhaba, online terapi seansları hakkında bilgi almak istiyorum.',
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    read: true
  },
  {
    _id: 'mock-msg-2',
    name: 'Ayşe Demir',
    email: 'ayse@example.com',
    phone: '05554445566',
    subject: 'Fiyat Bilgisi',
    message: 'Seans ücretlerinizi öğrenebilir miyim?',
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    read: false
  }
];

module.exports = {
  mockUsers,
  mockAppointments,
  mockContacts
};

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TenantContactsPage() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ email: '', company_name: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tenant_contacts')
      .select('*')
      .order('company_name')
    if (!error) setContacts(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!form.email) return setError('Please enter an email.')
    if (!form.company_name) return setError('Please enter a company name.')
    setAdding(true)
    setError('')

    const { error } = await supabase
      .from('tenant_contacts')
      .insert([{
        email: form.email.toLowerCase().trim(),
        company_name: form.company_name.trim()
      }])

    if (error) {
      setError(error.message.includes('unique') ? 'This email is already registered.' : error.message)
    } else {
      setSuccess('Contact added successfully.')
      setForm({ email: '', company_name: '' })
      loadContacts()
      setTimeout(() => setSuccess(''), 3000)
    }
    setAdding(false)
  }

  const handleToggle = async (contact) => {
    await supabase
      .from('tenant_contacts')
      .update({ is_active: !contact.is_active })
      .eq('id', contact.id)
    loadContacts()
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    await supabase.from('tenant_contacts').delete().eq('id', id)
    loadContacts()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenant Contacts</h1>
        <p className="text-gray-500 text-sm mt-1">Manage which emails can access the tenant parking view</p>
      </div>

      {/* Add New Contact */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Add New Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="manager@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Must match exactly as in parking spots"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {adding ? 'Adding...' : '+ Add Contact'}
        </button>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-600">No tenant contacts yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => (
                <tr key={contact.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-900">{contact.email}</td>
                  <td className="px-4 py-3 text-gray-700">{contact.company_name}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(contact)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        contact.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {contact.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
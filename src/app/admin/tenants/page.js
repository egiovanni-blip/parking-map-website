'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const emptyForm = { email: '', full_name: '', company_name: '' }

export default function TenantContactsPage() {
  const [contacts, setContacts] = useState([])
  const [companyOptions, setCompanyOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [customCompany, setCustomCompany] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadContacts()
    loadCompanyOptions()
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

  const loadCompanyOptions = async () => {
    // Paginate — Supabase caps each response at 1000 rows
    const spots = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data } = await supabase
        .from('parking_spots')
        .select('display_label, original_label')
        .not('display_label', 'is', null)
        .not('original_label', 'is', null)
        .range(from, from + pageSize - 1)
      spots.push(...(data || []))
      if (!data || data.length < pageSize) break
      from += pageSize
    }

    const placeholderLabels = new Set(['unassigned', 'unlabeled'])

    const fromSpots = spots
      .map(s => s.display_label?.trim())
      .filter(name => name && !placeholderLabels.has(name.toLowerCase()))

    // Keep companies already in tenant_contacts only if they also have real allocated spots
    const allocatedCompanies = new Set(fromSpots.map(n => n.toLowerCase()))

    const { data: existing } = await supabase
      .from('tenant_contacts')
      .select('company_name')

    const fromContacts = (existing || [])
      .map(c => c.company_name?.trim())
      .filter(name => name && allocatedCompanies.has(name.toLowerCase()))

    const merged = [...new Set([...fromSpots, ...fromContacts])].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )
    setCompanyOptions(merged)
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setCustomCompany('')
    setError('')
  }

  const resolveCompany = () =>
    form.company_name === '__other__' ? customCompany.trim() : form.company_name

  const handleAdd = async () => {
    const resolvedCompany = resolveCompany()
    const fullName = form.full_name.trim()

    if (!form.email) return setError('Please enter an email.')
    if (!fullName) return setError('Please enter a full name.')
    if (!resolvedCompany) return setError('Please select or enter a company name.')
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('tenant_contacts')
      .insert([{
        email: form.email.toLowerCase().trim(),
        full_name: fullName,
        company_name: resolvedCompany,
      }])

    if (error) {
      setError(error.message.includes('unique') ? 'This email is already registered.' : error.message)
    } else {
      setSuccess('Contact added successfully.')
      resetForm()
      loadContacts()
      loadCompanyOptions()
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
  }

  const handleEdit = (contact) => {
    const companyInList = companyOptions.includes(contact.company_name)
    setEditingId(contact.id)
    setForm({
      email: contact.email || '',
      full_name: contact.full_name || '',
      company_name: companyInList ? contact.company_name : '__other__',
    })
    setCustomCompany(companyInList ? '' : (contact.company_name || ''))
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveEdit = async () => {
    const resolvedCompany = resolveCompany()
    const fullName = form.full_name.trim()

    if (!form.email) return setError('Please enter an email.')
    if (!fullName) return setError('Please enter a full name.')
    if (!resolvedCompany) return setError('Please select or enter a company name.')
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('tenant_contacts')
      .update({
        email: form.email.toLowerCase().trim(),
        full_name: fullName,
        company_name: resolvedCompany,
      })
      .eq('id', editingId)

    if (error) {
      setError(error.message.includes('unique') ? 'This email is already registered.' : error.message)
    } else {
      setSuccess('Contact updated successfully.')
      resetForm()
      loadContacts()
      loadCompanyOptions()
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
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
    if (editingId === id) resetForm()
    await supabase.from('tenant_contacts').delete().eq('id', id)
    loadContacts()
  }

  const isEditing = Boolean(editingId)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenant Contacts</h1>
        <p className="text-gray-500 text-sm mt-1">Manage which emails can access the tenant parking view</p>
      </div>

      {/* Add / Edit Contact */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          {isEditing ? 'Edit Contact' : 'Add New Contact'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Jane Smith"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
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
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              value={form.company_name}
              onChange={(e) => {
                setForm({ ...form, company_name: e.target.value })
                if (e.target.value !== '__other__') setCustomCompany('')
              }}
            >
              <option value="">— Select a company —</option>
              {companyOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value="__other__">Other (type manually)</option>
            </select>
            {form.company_name === '__other__' && (
              <input
                type="text"
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Enter company name exactly as in parking spots"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
              />
            )}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={isEditing ? handleSaveEdit : handleAdd}
            disabled={saving}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving
              ? (isEditing ? 'Saving...' : 'Adding...')
              : (isEditing ? 'Save Changes' : '+ Add Contact')}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
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
                <th className="text-left px-4 py-3 font-medium text-gray-700">Full Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => (
                <tr
                  key={contact.id}
                  className={`border-b border-gray-100 last:border-0 ${
                    editingId === contact.id ? 'bg-gray-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-gray-900">{contact.full_name || '—'}</td>
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(contact)}
                      className="text-gray-600 hover:text-gray-900 text-xs mr-3"
                    >
                      Edit
                    </button>
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

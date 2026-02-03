'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { Plus, Tag, DollarSign, Archive, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getListasPrecios, createListaPrecio } from '@/services/precios';
import type { ListaPrecio } from '@/types/database';

export default function ListasPreciosPage() {
    const router = useRouter();
    const [listas, setListas] = useState<ListaPrecio[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [tipo, setTipo] = useState<'COSTO' | 'VENTA'>('COSTO');

    useEffect(() => {
        loadListas();
    }, []);

    async function loadListas() {
        setLoading(true);
        const data = await getListasPrecios();
        setListas(data);
        setLoading(false);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);

        const nuevaLista = await createListaPrecio({
            nombre,
            descripcion,
            tipo
        });

        if (nuevaLista) {
            setListas([...listas, nuevaLista]);
            setShowForm(false);
            setNombre('');
            setDescripcion('');
            setTipo('COSTO');
        }

        setCreating(false);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Listas de Precios</h1>
                    <p className="text-[var(--text-secondary)]">Gestiona tus listas de costos y precios de venta</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Lista
                </Button>
            </div>

            {/* Formulario de Creación */}
            {showForm && (
                <Card className="p-6 bg-[var(--bg-secondary)] border-[var(--border-default)] animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Nombre de la Lista</label>
                                <Input
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    placeholder="Ej: Costo Materia Prima 2026"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Tipo</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value as 'COSTO' | 'VENTA')}
                                >
                                    <option value="COSTO">Lista de Costos (Proveedores)</option>
                                    <option value="VENTA">Lista de Venta (Clientes)</option>
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Descripción (Opcional)</label>
                                <Input
                                    value={descripcion}
                                    onChange={e => setDescripcion(e.target.value)}
                                    placeholder="Descripción breve para identificar esta lista..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit" disabled={creating}>
                                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Crear Lista
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Listado */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                </div>
            ) : listas.length === 0 ? (
                <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-default)]">
                    <Tag className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">No hay listas creadas</h3>
                    <p className="text-[var(--text-secondary)] mb-6">Crea tu primera lista para empezar a asignar precios.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listas.map(lista => (
                        <Card key={lista.id} className="p-5 hover:border-[var(--accent-gold)] transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg ${lista.tipo === 'COSTO' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                                    {lista.tipo === 'COSTO' ? <Tag className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                </div>
                                <div className="px-2 py-1 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                    {lista.tipo}
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{lista.nombre}</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4 min-h-[40px]">
                                {lista.descripcion || 'Sin descripción'}
                            </p>
                            <div className="pt-4 border-t border-[var(--border-default)] flex justify-between items-center text-xs text-[var(--text-muted)]">
                                <span>Creada el {new Date(lista.created_at).toLocaleDateString()}</span>
                                {lista.activa ? (
                                    <span className="flex items-center text-green-500">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" />
                                        Activa
                                    </span>
                                ) : (
                                    <span className="flex items-center text-[var(--text-muted)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-2" />
                                        Archivada
                                    </span>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

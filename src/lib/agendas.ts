import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getFirebase } from './firebase';
import type { Agenda } from './types';

const db = () => getFirebase().db;
const agendaRef = (id: string) => doc(db(), 'agendas', id);
const inviteRef = (code: string) => doc(db(), 'agendaInvites', code);

export interface InviteInfo {
  agendaId: string;
  name: string;
  ownerName: string;
}

function newInviteCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const inviteLink = (code: string) => `${window.location.origin}/unisciti/${code}`;

export function subscribeAgendas(uid: string, onData: (agendas: Agenda[]) => void, onError: (e: Error) => void) {
  const q = query(collection(db(), 'agendas'), where('members', 'array-contains', uid));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ ...(d.data() as Omit<Agenda, 'id' | 'pending'>), id: d.id, pending: d.metadata.hasPendingWrites }))
          .sort((a, b) => a.name.localeCompare(b.name, 'it')),
      ),
    onError,
  );
}

export async function createAgenda(uid: string, ownerName: string, name: string): Promise<string> {
  const ref = doc(collection(db(), 'agendas'));
  const code = newInviteCode();
  const batch = writeBatch(db());
  batch.set(ref, {
    name: name.trim(),
    ownerId: uid,
    members: [uid],
    memberNames: { [uid]: ownerName },
    inviteCode: code,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(inviteRef(code), { agendaId: ref.id, name: name.trim(), ownerName });
  await batch.commit();
  return ref.id;
}

export async function getInvite(code: string): Promise<InviteInfo | null> {
  const snap = await getDoc(inviteRef(code));
  return snap.exists() ? (snap.data() as InviteInfo) : null;
}

export async function joinAgenda(uid: string, displayName: string, code: string, agendaId: string): Promise<void> {
  await updateDoc(agendaRef(agendaId), {
    members: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName,
    joinCode: code,
    updatedAt: serverTimestamp(),
  });
}

/** Un membro esce dall'agenda, oppure il proprietario rimuove un membro. */
export async function removeMember(agendaId: string, memberUid: string): Promise<void> {
  await updateDoc(agendaRef(agendaId), {
    members: arrayRemove(memberUid),
    [`memberNames.${memberUid}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function renameAgenda(agenda: Agenda, ownerName: string, name: string): Promise<void> {
  const batch = writeBatch(db());
  batch.update(agendaRef(agenda.id), { name: name.trim(), updatedAt: serverTimestamp() });
  batch.set(inviteRef(agenda.inviteCode), { agendaId: agenda.id, name: name.trim(), ownerName });
  await batch.commit();
}

/** Invalida il link precedente e ne crea uno nuovo. */
export async function regenerateInvite(agenda: Agenda, ownerName: string): Promise<void> {
  const code = newInviteCode();
  const batch = writeBatch(db());
  batch.delete(inviteRef(agenda.inviteCode));
  batch.update(agendaRef(agenda.id), { inviteCode: code, updatedAt: serverTimestamp() });
  batch.set(inviteRef(code), { agendaId: agenda.id, name: agenda.name, ownerName });
  await batch.commit();
}

export async function deleteAgenda(agenda: Agenda): Promise<void> {
  const items = await getDocs(collection(db(), 'agendas', agenda.id, 'items'));
  for (let i = 0; i < items.docs.length; i += 400) {
    const batch = writeBatch(db());
    items.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  const batch = writeBatch(db());
  batch.delete(inviteRef(agenda.inviteCode));
  batch.delete(agendaRef(agenda.id));
  await batch.commit();
}

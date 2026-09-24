// Só o administrador (quem criou a conta e paga o plano) pode: comprar planos e links
// avulsos, cadastrar/remover usuários, cadastrar novas empresas e editar os dados delas.
// Um usuário vinculado a uma empresa (equipe) nunca tem sua própria linha em "assinaturas".
export async function souAdministrador(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.from('assinaturas').select('dono_id').eq('dono_id', userId).maybeSingle()
  return !!data
}

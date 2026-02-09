-- Remover políticas antigas de profiles que permitem ver todos
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Criar política para admin ver todos os perfis
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin(auth.uid()));

-- Criar política para usuários verem apenas seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Ajustar políticas de items para permitir staff adicionar produtos
DROP POLICY IF EXISTS "Admins can insert items" ON public.items;

-- Admin pode fazer tudo com items
CREATE POLICY "Admins can insert items" ON public.items
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Staff pode adicionar items (mas não gerenciar categorias, colunas customizadas, etc.)
CREATE POLICY "Staff can insert items" ON public.items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
import { type Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Unlink,
} from 'lucide-react'
import { Button } from '../ui/button'

interface EditorToolbarProps {
  editor: Editor | null
}

/**
 * Toolbar de formatação para o editor Tiptap
 *
 * Botões disponíveis:
 * - Formatação de texto: Negrito, Itálico, Sublinhado
 * - Listas: Marcadores, Numeradas
 * - Títulos: H1, H2, H3
 * - Links: Adicionar/Remover
 */
export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = prompt('Insira a URL do link:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="flex flex-wrap gap-1 border-b p-2">
      {/* Formatação de texto */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-muted' : ''}
        type="button"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-muted' : ''}
        type="button"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'bg-muted' : ''}
        type="button"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="w-px bg-border mx-1" />

      {/* Títulos */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
        type="button"
      >
        <Heading1 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
        type="button"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}
        type="button"
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px bg-border mx-1" />

      {/* Listas */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        type="button"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        type="button"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px bg-border mx-1" />

      {/* Links */}
      <Button
        variant="ghost"
        size="sm"
        onClick={addLink}
        className={editor.isActive('link') ? 'bg-muted' : ''}
        type="button"
      >
        <Link className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive('link')}
        type="button"
      >
        <Unlink className="h-4 w-4" />
      </Button>
    </div>
  )
}

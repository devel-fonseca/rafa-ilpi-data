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
  Table,
  TableProperties,
  Columns,
  Rows,
  Trash2,
  Combine,
  Split,
  ArrowRight,
  ArrowDown,
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
 * - Tabelas: Inserir, Adicionar/Remover linhas e colunas, Mesclar/Dividir células, Deletar tabela
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

      <div className="w-px bg-border mx-1" />

      {/* Tabelas */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Inserir tabela 3x3"
        type="button"
      >
        <Table className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        disabled={!editor.can().addColumnBefore()}
        title="Adicionar coluna antes"
        type="button"
      >
        <Columns className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        disabled={!editor.can().addColumnAfter()}
        title="Adicionar coluna depois"
        type="button"
      >
        <Columns className="h-4 w-4" />
        <ArrowRight className="h-3 w-3 -ml-1" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        disabled={!editor.can().addRowBefore()}
        title="Adicionar linha antes"
        type="button"
      >
        <Rows className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        disabled={!editor.can().addRowAfter()}
        title="Adicionar linha depois"
        type="button"
      >
        <Rows className="h-4 w-4" />
        <ArrowDown className="h-3 w-3 -ml-1" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        disabled={!editor.can().deleteColumn()}
        title="Remover coluna"
        type="button"
      >
        <Columns className="h-4 w-4 text-destructive" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().deleteRow().run()}
        disabled={!editor.can().deleteRow()}
        title="Remover linha"
        type="button"
      >
        <Rows className="h-4 w-4 text-destructive" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().deleteTable().run()}
        disabled={!editor.can().deleteTable()}
        title="Deletar tabela"
        type="button"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        disabled={!editor.can().toggleHeaderRow()}
        className={editor.isActive('table') ? 'bg-muted' : ''}
        title="Alternar linha de cabeçalho"
        type="button"
      >
        <TableProperties className="h-4 w-4" />
      </Button>

      <div className="w-px bg-border mx-1" />

      {/* Mesclar/Dividir células */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!editor.can().mergeCells()}
        title="Mesclar células selecionadas"
        type="button"
      >
        <Combine className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!editor.can().splitCell()}
        title="Dividir célula"
        type="button"
      >
        <Split className="h-4 w-4" />
      </Button>
    </div>
  )
}

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { EditorToolbar } from './EditorToolbar'
import { useEffect } from 'react'

interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

/**
 * Componente de editor WYSIWYG usando Tiptap
 *
 * Funcionalidades:
 * - Formatação de texto (negrito, itálico, sublinhado)
 * - Títulos (H1, H2, H3)
 * - Listas (marcadores e numeradas)
 * - Links
 * - Tabelas (inserir, adicionar/remover linhas e colunas)
 * - Toolbar visual com botões
 *
 * @example
 * ```tsx
 * <TiptapEditor
 *   content={documentContent}
 *   onChange={setDocumentContent}
 *   placeholder="Digite o conteúdo do documento..."
 * />
 * ```
 */
export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Digite o conteúdo do documento...',
  className = '',
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'tiptap p-4 min-h-[200px] focus:outline-none ' +
          className,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sincronizar conteúdo externo com o editor
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="tiptap-editor"
        placeholder={placeholder}
      />
    </div>
  )
}

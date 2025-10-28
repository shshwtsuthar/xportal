'use client';

import * as React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type MinimalTiptapProps = {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
};

export function MinimalTiptap({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  editable = true,
  className,
}: MinimalTiptapProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-hidden min-h-[280px] p-3',
        'aria-label': 'Email body editor',
      },
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  return (
    <div className={cn('flex flex-col rounded-md border', className)}>
      <div className="flex flex-wrap items-center gap-1 p-2">
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('bold')}
          onPressedChange={() => editor?.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('italic')}
          onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('strike')}
          onPressedChange={() => editor?.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
        >
          <Strikethrough className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('code')}
          onPressedChange={() => editor?.chain().focus().toggleCode().run()}
          aria-label="Inline code"
        >
          <Code className="size-4" />
        </Toggle>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('heading', { level: 1 })}
          onPressedChange={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
          aria-label="Heading 1"
        >
          <Heading1 className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('heading', { level: 2 })}
          onPressedChange={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
          aria-label="Heading 2"
        >
          <Heading2 className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('heading', { level: 3 })}
          onPressedChange={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
          aria-label="Heading 3"
        >
          <Heading3 className="size-4" />
        </Toggle>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('bulletList')}
          onPressedChange={() =>
            editor?.chain().focus().toggleBulletList().run()
          }
          aria-label="Bullet list"
        >
          <List className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('orderedList')}
          onPressedChange={() =>
            editor?.chain().focus().toggleOrderedList().run()
          }
          aria-label="Ordered list"
        >
          <ListOrdered className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={!!editor?.isActive('blockquote')}
          onPressedChange={() =>
            editor?.chain().focus().toggleBlockquote().run()
          }
          aria-label="Blockquote"
        >
          <Quote className="size-4" />
        </Toggle>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          aria-label="Insert horizontal rule"
        >
          <Minus className="size-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => editor?.chain().focus().undo().run()}
          aria-label="Undo"
        >
          <Undo className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => editor?.chain().focus().redo().run()}
          aria-label="Redo"
        >
          <Redo className="size-4" />
        </Button>
      </div>
      <Separator />
      <div className="relative">
        {!editor?.getText().length && (
          <span className="text-muted-foreground pointer-events-none absolute top-3 left-3 text-sm">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

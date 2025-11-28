'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Props = {
  subject: string;
  body: string;
  attachments: File[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  tags: string[];
  expiryDate: string;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onAttachmentsChange: (attachments: File[]) => void;
  onPriorityChange: (priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') => void;
  onTagsChange: (tags: string[]) => void;
  onExpiryDateChange: (expiryDate: string) => void;
};

export function ContentStep({
  subject,
  body,
  attachments,
  priority,
  tags,
  expiryDate,
  onSubjectChange,
  onBodyChange,
  onAttachmentsChange,
  onPriorityChange,
  onTagsChange,
  onExpiryDateChange,
}: Props) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onAttachmentsChange([...attachments, ...files]);
  };

  const handleRemoveAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (!tags.includes(newTag)) {
        onTagsChange([...tags, newTag]);
      }
      e.currentTarget.value = '';
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="subject" className="text-base font-semibold">
          Subject <span className="text-destructive">*</span>
        </Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Enter announcement subject"
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="body" className="text-base font-semibold">
          Body <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Enter announcement body"
          className="mt-1 min-h-[200px]"
          required
        />
      </div>

      <div>
        <Label className="text-base font-semibold">Attachments</Label>
        <div className="mt-2">
          <Input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="cursor-pointer"
            aria-label="Select files to attach"
          />
          {attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <span className="text-sm">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttachment(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="priority" className="text-base font-semibold">
          Priority
        </Label>
        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger id="priority" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="tags" className="text-base font-semibold">
          Tags
        </Label>
        <Input
          id="tags"
          placeholder="Press Enter to add a tag"
          onKeyDown={handleTagInput}
          className="mt-1"
        />
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-muted ml-1 rounded-full"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="expiryDate" className="text-base font-semibold">
          Expiry Date
        </Label>
        <Input
          id="expiryDate"
          type="date"
          value={expiryDate}
          onChange={(e) => onExpiryDateChange(e.target.value)}
          className="mt-1"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Optional expiration date
        </p>
      </div>
    </div>
  );
}

import { Columns, Rows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderBarProps {
  sessionTitle: string;
  isSplitView: boolean;
  onToggleSplitView: () => void;
}

export function HeaderBar({ sessionTitle, isSplitView, onToggleSplitView }: HeaderBarProps) {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
      {/* Title - centered with some left padding for mobile menu button */}
      <div className="flex-1 pl-12 lg:pl-0">
        <h1 className="text-sm font-medium truncate">{sessionTitle}</h1>
        <p className="text-xs text-muted-foreground">Commodity Trading Rules</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isSplitView ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onToggleSplitView}
              className="gap-2"
            >
              {isSplitView ? (
                <>
                  <Rows className="h-4 w-4" />
                  <span className="hidden sm:inline">Standard View</span>
                </>
              ) : (
                <>
                  <Columns className="h-4 w-4" />
                  <span className="hidden sm:inline">Split View</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSplitView ? 'Switch to standard view' : 'Enable verbatim split view'}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

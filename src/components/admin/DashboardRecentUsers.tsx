
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Props {
  recentUsers: any[];
}

export const DashboardRecentUsers = ({ recentUsers }: Props) => (
  <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white">
    <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 py-4">
      <CardTitle className="text-lg font-bold text-gray-800">Recent Users</CardTitle>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-8">Filter</Button>
        <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-8">Export</Button>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableHeader className="bg-gray-50/50">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider pl-6">Customer</TableHead>
            <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Plan</TableHead>
            <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</TableHead>
            <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-right pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentUsers.map((user) => (
            <TableRow key={user.id} className="hover:bg-gray-50/50 border-gray-50">
              <TableCell className="pl-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-gray-100">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-blue-50 text-blue-500 text-xs">
                      {user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{user.display_name || user.username}</span>
                    <span className="text-xs text-gray-400">@{user.username}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium text-gray-600">{user.plan_type || "Free"}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-500">{format(new Date(user.created_at), "MMM dd, yyyy")}</span>
              </TableCell>
              <TableCell className="text-right pr-6">
                <Badge
                  className={
                    user.is_premium
                      ? "bg-green-100 text-green-600 hover:bg-green-200 border-none shadow-none"
                      : "bg-yellow-100 text-yellow-600 hover:bg-yellow-200 border-none shadow-none"
                  }
                >
                  {user.is_premium ? "Premium" : "Free"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

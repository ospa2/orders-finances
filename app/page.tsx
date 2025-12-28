import { AppSidebar } from "@/components/app-sidebar";
import CardUsageRingsChart from "@/components/cards-usage-rings";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { MonthlyRevenueChart } from "@/components/monthly-revenue-chart";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChartDataProvider } from "@/lib/сhartDataProvider";
import { ThemeProvider } from "next-themes";

export default function Page() {
   return (
      <ThemeProvider attribute="class" defaultTheme="system">
         <ChartDataProvider>
            <SidebarProvider
               style={
                  {
                     "--sidebar-width": "calc(var(--spacing) * 72)",
                     "--header-height": "calc(var(--spacing) * 12)",
                  } as React.CSSProperties
               }
            >
               <AppSidebar variant="inset" />
               <SidebarInset>
                  <SiteHeader />
                  <div className="flex flex-1 flex-col">
                     <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                           <SectionCards />
                           <div className="px-4 lg:px-6">
                              <ChartAreaInteractive />
                           </div>
                           <div className="px-4 lg:px-6">
                              <MonthlyRevenueChart />
                           </div>

                           <div className="px-4 lg:px-6">
                              <CardUsageRingsChart />
                           </div>
                           <DataTable/>
                        </div>
                     </div>
                  </div>
               </SidebarInset>
            </SidebarProvider>
         </ChartDataProvider>
      </ThemeProvider>
   );
}

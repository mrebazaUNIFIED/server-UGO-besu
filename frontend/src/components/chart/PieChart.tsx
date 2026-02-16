import React from "react";

import {
  Chart,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
  ChartSeriesLabels,
  ChartTooltip,
} from "@progress/kendo-react-charts";

interface DoughnutChartProps {
  data: any;
}

const labelContent = (e: any) => `${e.category}: (${e.dataItem.totalLoans}%)`;

const renderTooltip = (context: any) => {
  const { category, value } = context.point || context;
  return (
    <label style={{ font: "14px  Roboto, Arial, sans-serif" }}>
      {category}: {value}%
    </label>
  );
};

const PieChart: React.FC<DoughnutChartProps> = ({ data }) => {
  const legend = { labels: { font: "12px Roboto, Arial, sans-serif" } };
  const sortedData = [...data].sort((a, b) => b.totalLoans - a.totalLoans);
  const firstLoans = sortedData.slice(0, 10);
  let loans = firstLoans;
  if (data.length > 10) {
    const othertLoan = sortedData
      .slice(10)
      .reduce((acc, curr) => acc + curr.totalLoans, 0);
    loans = [...firstLoans, { stateName: "Others", totalLoans: othertLoan }];
  }
  const totalLoan = loans.reduce((acc, curr) => acc + curr.totalLoans, 0);

  const newData = loans.map(({ stateName, totalLoans }) => ({
    stateName,
    totalLoans: parseFloat(((totalLoans / totalLoan) * 100).toFixed(2)),
  }));

  return (
    <Chart style={{ minWidth: 100, height: 400, display: "flex", flexDirection:"column" }}>
      <ChartTooltip render={renderTooltip} />
      <ChartLegend
        orientation="horizontal"
        position="bottom"
        visible={true}
        width={570}
        reverse={true}
        height={2000}
        {...legend}
      />

      <ChartSeries>
        <ChartSeriesItem
          type="donut"
          data={newData}
          categoryField="stateName"
          field="totalLoans"
        >
          <ChartSeriesLabels
            position="outsideEnd"
            color="black"
            align="circle"
            background="none"
            margin={3}
            distance={30}
            content={labelContent}
            font="11px  Roboto, Arial, sans-serif"
          />
        </ChartSeriesItem>
      </ChartSeries>
    </Chart>
  );
};

export default PieChart;

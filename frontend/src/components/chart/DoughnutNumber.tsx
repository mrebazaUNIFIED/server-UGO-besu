import React from "react";
import {
  Chart,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem,
  type SeriesVisualArgs,
} from "@progress/kendo-react-charts";

interface PieChartProps {
  listData: number | string;
}

const DoughnutNumber: React.FC<PieChartProps> = ({ listData }) => {
  const data = [{ kind: "A", share: 1, color: "#a2ccef" }];

  let center: any;

  let radius: any;

  const donutCenterRenderer = () => (
    <span style={{ fontSize: "13px" }}>
      <label>{listData}</label>
    </span>
  );
  const visualHandler = (e: SeriesVisualArgs) => {
    // Obtain parameters for the segments
    center = e.center;
    radius = e.innerRadius;

    // Create default visual
    return e.createVisual();
  };
  return (
    <Chart
      donutCenterRender={donutCenterRenderer}
      style={{ minWidth: 160, height: 150 }}
    >
      <ChartSeries>
        <ChartSeriesItem
          type="donut"
          startAngle={90}
          holeSize={60}
          data={data}
          colorField="color"
          categoryField="kind"
          field="share"
          visual={visualHandler}
        ></ChartSeriesItem>
      </ChartSeries>
      <ChartLegend visible={false} />
    </Chart>
  );
};

export default DoughnutNumber;

import React from "react";
import {TileLayout} from "@progress/kendo-react-layout";
import "@progress/kendo-theme-material/dist/all.css";
import useWidgets from "../../widgets/Widgets"
import "../../widgets/Widgets.css"

function Dashboard() {
  const {widgets} = useWidgets()
  /*const handleReposition = e => {
    widgets(e.value);
  };*/

  return (
      <TileLayout
      className="tileLayout"
      columns={4}
      rows={2}
      rowHeight={375}
      gap={{ rows: 10, columns: 10 }}
      positions={widgets}
      items={widgets}
      //onReposition={}
      style={{
        marginTop: "80px"
      }
      }
  />)
}

export default Dashboard
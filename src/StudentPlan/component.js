import React, { Component } from "react";
import PropTypes from "prop-types";

export default class StudentPlanComponent extends Component {
  makePlan = obj => {
    const makeMod = (year, sem, mod) => (
      <React.Fragment key={mod}>
        {this.props.makeButton(
          mod["Name"],
          () => this.props.delMod(mod["Name"], mod["MCs"], year, sem),
          mod["Name"]
        )}
        {
          <select>
            {[
              5.0,
              4.5,
              4.0,
              3.5,
              3.0,
              2.5,
              2.0,
              1.5,
              1.0,
              0.5,
              0.0,
              "S",
              "U"
            ].map(grade => (
              <option
                key={grade}
                onClick={e => this.props.updateGrade(e, year, sem, mod["Name"])}
              >
                {grade}
              </option>
            ))}
          </select>
        }
      </React.Fragment>
    );

    const makeSem = (year, sem) => {
      const mods = this.props
        .getMods(obj, year, sem)
        .map(mod => makeMod(year, sem, mod));
      const overload = () => {
        if (this.props.getOverload(this.props.studentMods, year, sem)) {
          return (
            <React.Fragment>
              <text>Overload!</text>
            </React.Fragment>
          );
        }
        // <React.Fragment>
        //   {this.getOverload(this.state.studentMods, year, sem) ? (
        //     <text>Overload!</text>
        //   ) : (
        //     <input
        //       type="checkbox"
        //       onClick={() => this.updateOverload(year, sem)}
        //     />
        //   )}
        // </React.Fragment>
      };
      const result = (
        <React.Fragment>
          {this.props.makeTable("Mods", mods)}
          {this.props.makeTable("Overload", overload)}
        </React.Fragment>
      );
      return this.props.makeTable(sem, result);
    };

    const makeYear = year => {
      const result = (
        <React.Fragment>
          {makeSem(year, "Sem 1")}
          {makeSem(year, "Sem 2")}
        </React.Fragment>
      );
      return this.props.makeTable(year, result);
    };

    return this.props.getYears(this.props.studentMods).map(makeYear);
  };

  render() {
    return (
      <div>
        Your Mods:
        {this.makePlan(this.props.studentMods, [])} <br />
        Your MCs: {this.props.mcs}
        <br />
      </div>
    );
  }
}

StudentPlanComponent.propTypes = {
  delMod: PropTypes.func.isRequired,
  getMods: PropTypes.func.isRequired,
  getOverload: PropTypes.func.isRequired,
  getYears: PropTypes.func.isRequired,
  makeButton: PropTypes.func.isRequired,
  makeTable: PropTypes.func.isRequired,
  mcs: PropTypes.number.isRequired,
  studentMods: PropTypes.object.isRequired,
  updateGrade: PropTypes.func.isRequired
};

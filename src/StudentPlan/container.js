import React, { Component } from "react";
import PropTypes from "prop-types";

import StudentPlanComponent from "./component";

export default class StudentPlan extends Component {
  setGrade = (plan, year, sem, modName, grade) => {
    const newPlan = this.props.copyObj(plan);
    newPlan[year][sem]["Mods"].find(mod => mod["Name"] === modName)[
      "Grade"
    ] = grade;
    return newPlan;
  };

  updateGrade = (event, year, sem, modName) => {
    const mods = this.setGrade(
      this.props.studentMods,
      year,
      sem,
      modName,
      event.target.value
    );
    this.props.setAppState("studentMods", mods);
  };

  delMod = (mod, mcs, year, sem) => {
    var currStudentMods = this.props.copyObj(this.props.studentMods);
    const newMods = this.props
      .getMods(currStudentMods, year, sem)
      .filter(elem => elem["Name"] !== mod);
    const newStudentMods = this.props.setMods(
      currStudentMods,
      year,
      sem,
      newMods
    );
    this.props.setAppState("studentMods", newStudentMods);
    this.props.setAppState("mc", this.props.mcs - mcs);
  };

  render() {
    return (
      <StudentPlanComponent
        delMod={this.delMod}
        getMods={this.props.getMods}
        getOverload={this.props.getOverload}
        getYears={this.props.getYears}
        makeButton={this.props.makeButton}
        makeTable={this.props.makeTable}
        mcs={this.props.mcs}
        studentMods={this.props.studentMods}
        updateGrade={this.updateGrade}
      />
    );
  }
}

StudentPlan.propTypes = {
  copyObj: PropTypes.func.isRequired,
  getMods: PropTypes.func.isRequired,
  getOverload: PropTypes.func.isRequired,
  getYears: PropTypes.func.isRequired,
  makeButton: PropTypes.func.isRequired,
  makeTable: PropTypes.func.isRequired,
  mcs: PropTypes.number.isRequired,
  setAppState: PropTypes.func.isRequired,
  setMods: PropTypes.func.isRequired,
  studentMods: PropTypes.object.isRequired
};

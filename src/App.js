import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
const axios = require('axios');

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {value: '',
                  modules: []};

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({value: event.target.value});
  }

  handleSubmit(event) {
    const url = `https://api.nusmods.com/2014-2015/2/modules/${this.state.value}.json`;
    axios.get(url)
    .then((response) => {
      this.setState((state, props) => ({
        // modules: state.modules.concat([response.data])
        modules: response.data
      }));
      console.log(url);
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    event.preventDefault();
  }

  
  render() {
    return (
      <div className="App">
            <form onSubmit={this.handleSubmit} onChange={this.handleChange}>
              <label>
                Module Code:
                <input type="text" name="name" />
              </label>
              <input type="submit" value="Submit" />
            </form>
            {Object.keys(this.state.modules).map(key => {
              return <p>{key}: {JSON.stringify(this.state.modules[key])}</p>;
            })}
      </div>
    );
  }
}

export default App;

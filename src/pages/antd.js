import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { LocaleProvider, Pagination, DatePicker } from 'antd';
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import 'antd/dist/antd.css';

class App extends Component {
  onShowSizeChange(current, pageSize) {
    console.log(current, pageSize);
  }
  
  onPageChange(pageNumber) {
    console.log('Page: ', pageNumber);
  }
  render() {
    return (
      <LocaleProvider locale={zh_CN}>
        <div style={{ margin: 20 }}>
          <Pagination defaultCurrent={1} total={50} />
          <Pagination showSizeChanger onShowSizeChange={this.onShowSizeChange} onChange={this.onChange} defaultCurrent={1} total={500} />
          <Pagination showQuickJumper defaultCurrent={1} total={500} onChange={this.onPageChange} />
          <DatePicker />
        </div>
      </LocaleProvider>
    );
  }
}

export default App;